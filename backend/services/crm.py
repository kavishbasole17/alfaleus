import hashlib
import logging
import httpx
from typing import Optional

logger = logging.getLogger("crm")

NOTION_API = "https://api.notion.com/v1"
AIRTABLE_API = "https://api.airtable.com/v0"
NOTION_VERSION = "2022-06-28"


# ── Notion ────────────────────────────────────────────────────

def _notion_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _change_to_notion_page(change: dict, db_id: str) -> dict:
    return {
        "parent": {"database_id": db_id},
        "properties": {
            "Name": {"title": [{"text": {"content": f"{change['competitor_name']} — {change['category'] or 'Change'}"}}]},
            "URL": {"url": change["competitor_url"]},
            "Category": {"select": {"name": change["category"] or "Other"}},
            "Impact Score": {"number": change["impact_score"] or 0},
            "Summary": {"rich_text": [{"text": {"content": (change["summary"] or "")[:2000]}}]},
            "Strategic Action": {"rich_text": [{"text": {"content": (change["strategic_action"] or "")[:2000]}}]},
            "Detected At": {"date": {"start": change["created_at"][:19]}},
        },
    }


async def notion_push(change: dict, token: str, db_id: str) -> str:
    """Push change to Notion DB. Returns Notion page ID."""
    idempotency_key = hashlib.md5(f"{change['id']}".encode()).hexdigest()

    async with httpx.AsyncClient(timeout=20) as client:
        # Idempotency: search for existing record with this change ID in title
        search_resp = await client.post(
            f"{NOTION_API}/databases/{db_id}/query",
            headers=_notion_headers(token),
            json={"filter": {"property": "Name", "title": {"contains": change["id"][:8]}}},
        )
        if search_resp.status_code == 200:
            results = search_resp.json().get("results", [])
            if results:
                logger.info(f"Notion record already exists for change {change['id']}")
                return results[0]["id"]

        page = _change_to_notion_page(change, db_id)
        # Embed change ID in name for idempotency
        page["properties"]["Name"]["title"][0]["text"]["content"] += f" [{change['id'][:8]}]"

        resp = await client.post(
            f"{NOTION_API}/pages",
            headers=_notion_headers(token),
            json=page,
        )
        resp.raise_for_status()
        page_id = resp.json()["id"]
        logger.info(f"Pushed to Notion: {page_id}")
        return page_id


# ── Airtable ──────────────────────────────────────────────────

def _airtable_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _change_to_airtable_fields(change: dict) -> dict:
    return {
        "Name": f"{change['competitor_name']} — {change['category'] or 'Change'} [{change['id'][:8]}]",
        "URL": change["competitor_url"] or "",
        "Category": change["category"] or "Other",
        "Impact Score": change["impact_score"] or 0,
        "Summary": (change["summary"] or "")[:100000],
        "Strategic Action": (change["strategic_action"] or "")[:100000],
        "Detected At": change["created_at"][:19],
        "Change ID": change["id"],
    }


async def airtable_push(change: dict, token: str, base_id: str, table: str) -> str:
    async with httpx.AsyncClient(timeout=20) as client:
        # Idempotency: search for existing Change ID
        search = await client.get(
            f"{AIRTABLE_API}/{base_id}/{table}",
            headers=_airtable_headers(token),
            params={"filterByFormula": f"{{Change ID}}='{change['id']}'"},
        )
        if search.status_code == 200:
            records = search.json().get("records", [])
            if records:
                logger.info(f"Airtable record already exists for {change['id']}")
                return records[0]["id"]

        resp = await client.post(
            f"{AIRTABLE_API}/{base_id}/{table}",
            headers=_airtable_headers(token),
            json={"fields": _change_to_airtable_fields(change)},
        )
        resp.raise_for_status()
        record_id = resp.json()["id"]
        logger.info(f"Pushed to Airtable: {record_id}")
        return record_id


# ── Unified push ──────────────────────────────────────────────

async def push_change(change: dict, settings: dict) -> Optional[str]:
    provider = settings.get("crm_provider", "notion")
    try:
        if provider == "notion":
            token = settings.get("notion_token", "")
            db_id = settings.get("notion_db_id", "")
            if not token or not db_id:
                raise ValueError("Notion token and DB ID are required")
            return await notion_push(change, token, db_id)
        elif provider == "airtable":
            token = settings.get("airtable_token", "")
            base_id = settings.get("airtable_base_id", "")
            table = settings.get("airtable_table", "Intelligence")
            if not token or not base_id:
                raise ValueError("Airtable token and Base ID are required")
            return await airtable_push(change, token, base_id, table)
        else:
            raise ValueError(f"Unknown CRM provider: {provider}")
    except Exception as e:
        logger.error(f"CRM push failed for change {change['id']}: {e}")
        raise
