import json
from fastapi import APIRouter
from database import get_db
from models import SettingsIn, OnboardingIn, BusinessProfile

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def _get(db, key: str) -> str | None:
    async with db.execute("SELECT value FROM settings WHERE key=?", (key,)) as cur:
        row = await cur.fetchone()
    return row["value"] if row else None


async def _set(db, key: str, value: str):
    await db.execute(
        "INSERT INTO settings (key,value) VALUES (?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )


@router.get("")
async def get_all_settings():
    async with get_db() as db:
        async with db.execute("SELECT key, value FROM settings") as cur:
            rows = await cur.fetchall()
    data = {r["key"]: r["value"] for r in rows}
    for secret in ("smtp_pass", "notion_token", "airtable_token"):
        if data.get(secret):
            data[secret] = "••••••••"
    return data


@router.post("/key")
async def upsert_setting(body: SettingsIn):
    async with get_db() as db:
        await _set(db, body.key, body.value)
        await db.commit()
    return {"ok": True}


@router.get("/profile", response_model=BusinessProfile)
async def get_profile():
    async with get_db() as db:
        raw = await _get(db, "business_profile")
    if not raw:
        return BusinessProfile()
    return BusinessProfile(**json.loads(raw))


@router.post("/onboarding")
async def save_onboarding(body: OnboardingIn):
    async with get_db() as db:
        await _set(db, "business_profile", body.profile.model_dump_json())
        if body.notion_token:
            await _set(db, "notion_token", body.notion_token)
        if body.notion_db_id:
            await _set(db, "notion_db_id", body.notion_db_id)
        if body.airtable_token:
            await _set(db, "airtable_token", body.airtable_token)
        if body.airtable_base_id:
            await _set(db, "airtable_base_id", body.airtable_base_id)
        if body.airtable_table:
            await _set(db, "airtable_table", body.airtable_table)
        if body.crm_provider:
            await _set(db, "crm_provider", body.crm_provider)
        if body.smtp_user:
            await _set(db, "smtp_user", body.smtp_user)
        if body.smtp_pass:
            await _set(db, "smtp_pass", body.smtp_pass)
        if body.digest_to:
            await _set(db, "digest_to", body.digest_to)
        await _set(db, "onboarding_complete", "true")
        await db.commit()
    return {"ok": True}


@router.get("/onboarding-status")
async def onboarding_status():
    async with get_db() as db:
        val = await _get(db, "onboarding_complete")
    return {"complete": val == "true"}
