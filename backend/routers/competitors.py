import uuid
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import get_db
from models import CompetitorCreate, CompetitorUpdate, CompetitorOut
from services.scraper import fetch_page
from services import embeddings as emb
from services import llm as llm_svc
from services import screenshot as ss

logger = logging.getLogger("competitors")
router = APIRouter(prefix="/api/competitors", tags=["competitors"])


async def _get_settings() -> dict:
    async with get_db() as db:
        async with db.execute("SELECT key, value FROM settings") as cur:
            rows = await cur.fetchall()
    return {r["key"]: r["value"] for r in rows}


# ── Full scrape + semantic diff + LLM pipeline ────────────────

async def run_scrape_pipeline(comp: dict):
    comp_id = comp["id"]
    url     = comp["url"]
    section = comp["section"]
    name    = comp["name"]
    now     = datetime.now(timezone.utc).isoformat()

    # 1. Fetch page
    result = await fetch_page(url, section)
    if result["error"]:
        async with get_db() as db:
            await db.execute(
                "UPDATE competitors SET status='error', error_message=?, last_checked=? WHERE id=?",
                (result["error"], now, comp_id),
            )
            await db.commit()
        return

    new_text = result["text"]
    new_hash = result["hash"]

    # 2. Get latest snapshot
    async with get_db() as db:
        async with db.execute(
            "SELECT id, content_hash, content_text, embedding FROM page_snapshots "
            "WHERE competitor_id=? ORDER BY scraped_at DESC LIMIT 1",
            (comp_id,),
        ) as cur:
            prev = await cur.fetchone()

    if not prev:
        # Store baseline — no diff yet
        screenshot_path = await ss.capture(url, comp_id, "baseline")
        snap_id = str(uuid.uuid4())
        new_emb = emb.embed(new_text)
        async with get_db() as db:
            await db.execute(
                "INSERT INTO page_snapshots "
                "(id,competitor_id,content_text,content_hash,embedding,scraped_at,screenshot_path) "
                "VALUES (?,?,?,?,?,?,?)",
                (snap_id, comp_id, new_text, new_hash,
                 emb.embedding_to_json(new_emb) if new_emb else None,
                 now, screenshot_path),
            )
            await db.execute(
                "UPDATE competitors SET last_checked=?, status='active', error_message=NULL WHERE id=?",
                (now, comp_id),
            )
            await db.commit()
        logger.info(f"Baseline stored for {name}")
        return

    # 3. Same hash → no change
    if prev["content_hash"] == new_hash:
        async with get_db() as db:
            await db.execute(
                "UPDATE competitors SET last_checked=?, status='active', error_message=NULL WHERE id=?",
                (now, comp_id),
            )
            await db.commit()
        logger.info(f"No change for {name}")
        return

    # 4. Semantic similarity check
    prev_emb = emb.embedding_from_json(prev["embedding"]) if prev["embedding"] else None
    new_emb  = emb.embed(new_text)

    from config import SEMANTIC_THRESHOLD
    is_significant = True
    if prev_emb and new_emb:
        dist = emb.semantic_distance(prev_emb, new_emb)
        is_significant = dist > SEMANTIC_THRESHOLD
        logger.info(f"{name}: dist={dist:.4f} threshold={SEMANTIC_THRESHOLD} significant={is_significant}")
    else:
        logger.warning(f"{name}: embeddings unavailable — treating hash diff as significant")

    # 5. Store new snapshot regardless
    screenshot_path = await ss.capture(url, comp_id, "after")
    snap_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO page_snapshots "
            "(id,competitor_id,content_text,content_hash,embedding,scraped_at,screenshot_path) "
            "VALUES (?,?,?,?,?,?,?)",
            (snap_id, comp_id, new_text, new_hash,
             emb.embedding_to_json(new_emb) if new_emb else None,
             now, screenshot_path),
        )
        await db.execute(
            "UPDATE competitors SET last_checked=?, status='active', error_message=NULL WHERE id=?",
            (now, comp_id),
        )
        await db.commit()

    if not is_significant:
        logger.info(f"{name}: cosmetic change filtered out")
        return

    # 6. LLM analysis
    settings = await _get_settings()
    bp_raw = settings.get("business_profile", "{}")
    try:
        business_profile = json.loads(bp_raw)
    except Exception:
        business_profile = {}

    analysis = await llm_svc.analyze_change(
        competitor_name=name,
        url=url,
        section=section,
        old_text=prev["content_text"],
        new_text=new_text,
        business_profile=business_profile,
    )

    diff_link = ss.screenshot_url_path(screenshot_path) if screenshot_path else None

    # 7. Store change + enqueue CRM
    change_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO changes "
            "(id,competitor_id,category,summary,impact_score,impact_justification,"
            "strategic_action,diff_link,snapshot_before_id,snapshot_after_id,created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (change_id, comp_id,
             analysis["category"], analysis["summary"], analysis["impact_score"],
             analysis["impact_justification"], analysis["strategic_action"],
             diff_link, prev["id"], snap_id, now),
        )
        await db.execute(
            "UPDATE competitors SET weekly_changes = weekly_changes + 1 WHERE id=?",
            (comp_id,),
        )
        q_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO crm_queue (id,change_id,status,attempts,created_at) VALUES (?,?,?,?,?)",
            (q_id, change_id, "pending", 0, now),
        )
        await db.commit()

    logger.info(f"Change recorded for {name}: {analysis['category']} score={analysis['impact_score']}")


# ── Routes ────────────────────────────────────────────────────

@router.get("", response_model=list[CompetitorOut])
async def list_competitors():
    async with get_db() as db:
        async with db.execute("SELECT * FROM competitors ORDER BY created_at DESC") as cur:
            rows = await cur.fetchall()
    return [CompetitorOut(**dict(r)) for r in rows]


@router.post("", response_model=CompetitorOut, status_code=201)
async def add_competitor(body: CompetitorCreate, bg: BackgroundTasks):
    async with get_db() as db:
        async with db.execute("SELECT id FROM competitors WHERE url=?", (body.url,)) as cur:
            if await cur.fetchone():
                raise HTTPException(409, "URL already tracked")

    comp_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc).isoformat()
    comp = {
        "id": comp_id, "name": body.name, "url": body.url,
        "section": body.section, "status": "active",
        "last_checked": None, "check_interval": body.check_interval,
        "weekly_changes": 0, "error_message": None, "created_at": now,
    }
    async with get_db() as db:
        await db.execute(
            "INSERT INTO competitors (id,name,url,section,status,last_checked,"
            "check_interval,weekly_changes,created_at) "
            "VALUES (:id,:name,:url,:section,:status,:last_checked,"
            ":check_interval,:weekly_changes,:created_at)",
            comp,
        )
        await db.commit()

    bg.add_task(run_scrape_pipeline, comp)
    return CompetitorOut(**comp)


@router.get("/{comp_id}", response_model=CompetitorOut)
async def get_competitor(comp_id: str):
    async with get_db() as db:
        async with db.execute("SELECT * FROM competitors WHERE id=?", (comp_id,)) as cur:
            row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Competitor not found")
    return CompetitorOut(**dict(row))


@router.put("/{comp_id}", response_model=CompetitorOut)
async def update_competitor(comp_id: str, body: CompetitorUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_clause = ", ".join(f"{k}=?" for k in updates)
    async with get_db() as db:
        await db.execute(
            f"UPDATE competitors SET {set_clause} WHERE id=?",
            list(updates.values()) + [comp_id],
        )
        await db.commit()
        async with db.execute("SELECT * FROM competitors WHERE id=?", (comp_id,)) as cur:
            row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Competitor not found")
    return CompetitorOut(**dict(row))


@router.delete("/{comp_id}", status_code=204)
async def delete_competitor(comp_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM competitors WHERE id=?", (comp_id,))
        await db.commit()


@router.post("/{comp_id}/scrape", status_code=202)
async def trigger_scrape(comp_id: str, bg: BackgroundTasks):
    async with get_db() as db:
        async with db.execute("SELECT * FROM competitors WHERE id=?", (comp_id,)) as cur:
            row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Competitor not found")
    bg.add_task(run_scrape_pipeline, dict(row))
    return {"status": "queued", "competitor_id": comp_id}
