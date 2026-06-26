import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger("scheduler")
_scheduler: AsyncIOScheduler | None = None


async def _run_scrapes():
    from database import get_db
    from routers.competitors import run_scrape_pipeline

    now = datetime.now(timezone.utc)
    async with get_db() as db:
        async with db.execute("SELECT * FROM competitors WHERE status != 'paused'") as cur:
            competitors = [dict(r) for r in await cur.fetchall()]

    for comp in competitors:
        try:
            last = comp.get("last_checked")
            if last:
                last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                if (now - last_dt) < timedelta(minutes=comp.get("check_interval", 360)):
                    continue
            logger.info(f"Scheduled scrape: {comp['name']}")
            await run_scrape_pipeline(comp)
        except Exception as e:
            logger.error(f"Scrape error for {comp.get('id')}: {e}")


async def _process_crm():
    try:
        from routers.crm import process_crm_queue
        await process_crm_queue()
    except Exception as e:
        logger.error(f"CRM queue error: {e}")


async def _send_weekly_digest():
    import os
    from database import get_db
    from services.email_digest import send_digest

    async with get_db() as db:
        async with db.execute("SELECT key, value FROM settings") as cur:
            rows = await cur.fetchall()
        settings = {r["key"]: r["value"] for r in rows}

        last_digest = settings.get("last_digest_at", "1970-01-01T00:00:00")
        async with db.execute(
            "SELECT ch.*, comp.name AS competitor_name, comp.url AS competitor_url "
            "FROM changes ch JOIN competitors comp ON comp.id=ch.competitor_id "
            "WHERE ch.created_at > ? ORDER BY ch.impact_score DESC",
            (last_digest,),
        ) as cur:
            changes = [dict(r) for r in await cur.fetchall()]

    base_url = os.getenv("APP_URL", "")
    sent = await send_digest(changes, settings, base_url)
    if sent:
        async with get_db() as db:
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                "INSERT INTO settings (key,value) VALUES (?,?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                ("last_digest_at", now),
            )
            await db.commit()


async def _reset_weekly_counts():
    from database import get_db
    async with get_db() as db:
        await db.execute("UPDATE competitors SET weekly_changes=0")
        await db.commit()
    logger.info("Weekly change counters reset")


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="UTC")

    _scheduler.add_job(_run_scrapes, IntervalTrigger(minutes=30), id="scrapes", max_instances=1, replace_existing=True)
    _scheduler.add_job(_process_crm, IntervalTrigger(minutes=5), id="crm_queue", max_instances=1, replace_existing=True)
    _scheduler.add_job(_send_weekly_digest, "cron", day_of_week="mon", hour=8, id="digest", replace_existing=True)
    _scheduler.add_job(_reset_weekly_counts, "cron", day_of_week="mon", hour=0, id="weekly_reset", replace_existing=True)

    _scheduler.start()
    logger.info("Scheduler started (scrape/30m, crm/5m, digest/weekly)")


def stop_scheduler():
    if _scheduler:
        _scheduler.shutdown(wait=False)
