import os
import json
import difflib
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("llm")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def model_status() -> dict:
    return {
        "enabled": bool(OPENAI_API_KEY),
        "provider": "openai",
        "model": OPENAI_MODEL,
        "ready": bool(OPENAI_API_KEY),
    }


def _diff_text(old: str, new: str, max_chars: int = 4000) -> str:
    old_sents = [s.strip() for s in old.replace(". ", ".\n").split("\n") if s.strip()]
    new_sents = [s.strip() for s in new.replace(". ", ".\n").split("\n") if s.strip()]
    diff = list(difflib.unified_diff(old_sents, new_sents, lineterm="", n=2))
    changed = "\n".join(l for l in diff if l.startswith(("+", "-")) and not l.startswith(("---", "+++")))
    return changed[:max_chars] if changed else new[:max_chars]


FALLBACK_CATEGORIES = {
    "pric": "Pricing", "plan": "Pricing", "subscription": "Pricing", "tier": "Pricing",
    "feature": "Product/Feature", "launch": "Product/Feature", "product": "Product/Feature",
    "hire": "Hiring", "job": "Hiring", "career": "Hiring", "position": "Hiring",
    "ceo": "Leadership", "cto": "Leadership", "founder": "Leadership", "appointed": "Leadership",
    "blog": "Content/Messaging", "announce": "Content/Messaging", "partner": "Content/Messaging",
}


def _keyword_classify(text: str) -> str:
    lower = text.lower()
    for keyword, cat in FALLBACK_CATEGORIES.items():
        if keyword in lower:
            return cat
    return "Other"


async def analyze_change(
    competitor_name: str,
    url: str,
    section: str,
    old_text: str,
    new_text: str,
    business_profile: dict,
) -> dict:
    diff = _diff_text(old_text, new_text)

    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set — returning keyword fallback")
        return {
            "category": _keyword_classify(diff),
            "summary": None,
            "impact_score": 5,
            "impact_justification": None,
            "strategic_action": None,
        }

    profile_ctx = "\n".join([
        f"Company: {business_profile.get('company_name', 'Unknown')}",
        f"Industry: {business_profile.get('industry', 'Unknown')}",
        f"Target Market: {business_profile.get('target_market', '')}",
        f"Differentiator: {business_profile.get('main_differentiator', '')}",
        f"Competitor Context: {business_profile.get('key_competitors_context', '')}",
    ])

    system_msg = (
        "You are a senior competitive intelligence analyst. "
        "Respond ONLY with a valid JSON object — no markdown fences, no text before or after."
    )
    user_msg = f"""Business Context:
{profile_ctx}

Competitor: {competitor_name} ({url})
Section monitored: {section}

Detected change (diff):
{diff}

Return JSON with exactly these keys:
{{
  "category": "Pricing|Product/Feature|Hiring|Content/Messaging|Leadership|Other",
  "summary": "<one clear paragraph explaining what changed and why it matters strategically>",
  "impact_score": <integer 1-10>,
  "impact_justification": "<one sentence explaining the score relative to the business context above>",
  "strategic_action": "<one concrete, specific action the business should take in response>"
}}"""

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=600,
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
        parsed["impact_score"] = max(1, min(10, int(parsed.get("impact_score", 5))))
        valid_cats = {"Pricing", "Product/Feature", "Hiring", "Content/Messaging", "Leadership", "Other"}
        if parsed.get("category") not in valid_cats:
            parsed["category"] = "Other"

        logger.info(f"OpenAI analysis complete for {competitor_name} — score {parsed['impact_score']}")
        return parsed

    except Exception as e:
        logger.error(f"OpenAI analysis failed: {e}")
        return {
            "category": _keyword_classify(diff),
            "summary": None,
            "impact_score": 5,
            "impact_justification": None,
            "strategic_action": None,
        }


# No-op kept for compatibility — OpenAI needs no local model download
async def download_model():
    if OPENAI_API_KEY:
        logger.info(f"LLM provider: OpenAI ({OPENAI_MODEL})")
    else:
        logger.warning("OPENAI_API_KEY not set — AI analysis will be unavailable")
