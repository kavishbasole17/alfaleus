import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks
from database import get_db
from services.crm import push_change

logger = logging.getLogger("crm_router")
router = APIRouter(prefix="/api/crm", tags=["crm"])

MAX_ATTEMPTS = 5


async def process_crm_queue():
    async with get_db() as db:
        async with db.execute(
            "SELECT key, value FROM settings"
        ) as cur:
            rows = await cur.fetchall()
        settings = {r["key"]: r["value"] for r in rows}

        crm_enabled = bool(settings.get("notion_token") or settings.get("airtable_token"))
        if not crm_enabled:
            return

        async with db.execute(
            "SELECT * FROM crm_queue WHERE status IN ('pending','retrying') AND attempts < ? "
            "ORDER BY created_at ASC LIMIT 10",
            (MAX_ATTEMPTS,),
        ) as cur:
            items = [dict(r) for r in await cur.fetchall()]

    for item in items:
        now = datetime.now(timezone.utc).isoformat()
        async with get_db() as db:
            async with db.execute(
                "SELECT ch.*, comp.name AS competitor_name, comp.url AS competitor_url "
                "FROM changes ch JOIN competitors comp ON comp.id=ch.competitor_id "
                "WHERE ch.id=?",
                (item["change_id"],),
            ) as cur:
                row = await cur.fetchone()

            if not row:
                await db.execute("UPDATE crm_queue SET status='failed' WHERE id=?", (item["id"],))
                await db.commit()
                continue

            change = dict(row)
            await db.execute(
                "UPDATE crm_queue SET status='processing', attempts=attempts+1, last_attempt=? WHERE id=?",
                (now, item["id"]),
            )
            await db.commit()

        try:
            async with get_db() as db:
                async with db.execute("SELECT key, value FROM settings") as cur:
                    rows = await cur.fetchall()
            settings = {r["key"]: r["value"] for r in rows}

            record_id = await push_change(change, settings)

            async with get_db() as db:
                await db.execute("UPDATE crm_queue SET status='done' WHERE id=?", (item["id"],))
                await db.execute(
                    "UPDATE changes SET crm_synced=1, crm_record_id=? WHERE id=?",
                    (record_id, change["id"]),
                )
                await db.commit()
            logger.info(f"CRM synced change {change['id']} → {record_id}")
        except Exception as e:
            attempts = item["attempts"] + 1
            status = "failed" if attempts >= MAX_ATTEMPTS else "retrying"
            async with get_db() as db:
                await db.execute(
                    "UPDATE crm_queue SET status=?, attempts=?, last_attempt=?, error_message=? WHERE id=?",
                    (status, attempts, now, str(e)[:500], item["id"]),
                )
                await db.commit()
            logger.warning(f"CRM sync failed ({attempts}/{MAX_ATTEMPTS}): {e}")


@router.get("/status")
async def crm_status():
    async with get_db() as db:
        async with db.execute(
            "SELECT status, COUNT(*) as cnt FROM crm_queue GROUP BY status"
        ) as cur:
            rows = await cur.fetchall()
    return {r["status"]: r["cnt"] for r in rows}


@router.post("/retry")
async def retry_failed(bg: BackgroundTasks):
    async with get_db() as db:
        await db.execute(
            "UPDATE crm_queue SET status='pending', attempts=0 WHERE status='failed'"
        )
        await db.commit()
    bg.add_task(process_crm_queue)
    return {"ok": True}


@router.post("/sync/{change_id}")
async def sync_single(change_id: str, bg: BackgroundTasks):
    async with get_db() as db:
        async with db.execute(
            "SELECT id FROM crm_queue WHERE change_id=?", (change_id,)
        ) as cur:
            row = await cur.fetchone()
        if not row:
            now = datetime.now(timezone.utc).isoformat()
            q_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO crm_queue (id,change_id,status,attempts,created_at) VALUES (?,?,?,?,?)",
                (q_id, change_id, "pending", 0, now),
            )
            await db.commit()
    bg.add_task(process_crm_queue)
    return {"ok": True}
