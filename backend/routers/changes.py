from fastapi import APIRouter, Query, HTTPException
from database import get_db
from models import ChangeOut

router = APIRouter(prefix="/api/changes", tags=["changes"])


@router.get("", response_model=list[ChangeOut])
async def list_changes(
    competitor_id: str | None = Query(None),
    category:      str | None = Query(None),
    unread_only:   bool       = Query(False),
    limit:         int        = Query(50, le=200),
    offset:        int        = Query(0),
):
    where, params = [], []
    if competitor_id:
        where.append("comp.id = ?"); params.append(competitor_id)
    if category:
        where.append("ch.category = ?"); params.append(category)
    if unread_only:
        where.append("ch.is_read = 0")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    sql = f"""
        SELECT ch.*, comp.name AS competitor_name, comp.url AS competitor_url
        FROM changes ch
        JOIN competitors comp ON comp.id = ch.competitor_id
        {where_sql}
        ORDER BY ch.created_at DESC
        LIMIT ? OFFSET ?
    """
    params += [limit, offset]

    async with get_db() as db:
        async with db.execute(sql, params) as cur:
            rows = await cur.fetchall()
    return [ChangeOut(**dict(r)) for r in rows]


@router.get("/unread-count")
async def unread_count():
    async with get_db() as db:
        async with db.execute("SELECT COUNT(*) FROM changes WHERE is_read=0") as cur:
            row = await cur.fetchone()
    return {"count": row[0]}


@router.get("/{change_id}", response_model=ChangeOut)
async def get_change(change_id: str):
    async with get_db() as db:
        async with db.execute(
            "SELECT ch.*, comp.name AS competitor_name, comp.url AS competitor_url "
            "FROM changes ch "
            "JOIN competitors comp ON comp.id = ch.competitor_id "
            "WHERE ch.id=?",
            (change_id,),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Change not found")
    return ChangeOut(**dict(row))


@router.patch("/{change_id}/read", status_code=204)
async def mark_read(change_id: str):
    async with get_db() as db:
        await db.execute("UPDATE changes SET is_read=1 WHERE id=?", (change_id,))
        await db.commit()


@router.patch("/mark-all-read", status_code=204)
async def mark_all_read():
    async with get_db() as db:
        await db.execute("UPDATE changes SET is_read=1")
        await db.commit()
