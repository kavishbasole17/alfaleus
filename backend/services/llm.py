import os
import json
import difflib
import logging
import asyncio
from typing import Optional

logger = logging.getLogger("llm")

MODEL_URL = (
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/"
    "qwen2.5-0.5b-instruct-q4_k_m.gguf"
)
MODEL_PATH = os.getenv("MODEL_PATH", "/app/data/models/qwen2.5-0.5b-q4_k_m.gguf")
LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"

_llm = None
_model_ready = False


async def download_model():
    global _model_ready
    if os.path.exists(MODEL_PATH):
        _model_ready = True
        logger.info(f"LLM model already present at {MODEL_PATH}")
        return True

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    logger.info(f"Downloading LLM model from HuggingFace to {MODEL_PATH} …")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=600, follow_redirects=True) as client:
            async with client.stream("GET", MODEL_URL) as r:
                r.raise_for_status()
                total = int(r.headers.get("content-length", 0))
                downloaded = 0
                with open(MODEL_PATH, "wb") as f:
                    async for chunk in r.aiter_bytes(1024 * 512):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total:
                            pct = downloaded / total * 100
                            if pct % 10 < 0.5:
                                logger.info(f"  LLM download: {pct:.0f}%")
        _model_ready = True
        logger.info("LLM model downloaded successfully")
        return True
    except Exception as e:
        logger.error(f"LLM model download failed: {e}")
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        return False


def _get_llm():
    global _llm, _model_ready
    if not LLM_ENABLED or not _model_ready:
        return None
    if _llm is not None:
        return _llm
    try:
        from llama_cpp import Llama
        _llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,
            n_threads=1,
            n_gpu_layers=0,
            verbose=False,
        )
        logger.info("LLM loaded into memory")
    except Exception as e:
        logger.error(f"LLM load failed: {e}")
    return _llm


def model_status() -> dict:
    return {
        "enabled": LLM_ENABLED,
        "downloaded": os.path.exists(MODEL_PATH),
        "ready": _model_ready,
        "loaded": _llm is not None,
        "path": MODEL_PATH,
    }


def _diff_text(old: str, new: str, max_chars: int = 3000) -> str:
    old_sents = [s.strip() for s in old.replace(". ", ".\n").split("\n") if s.strip()]
    new_sents = [s.strip() for s in new.replace(". ", ".\n").split("\n") if s.strip()]
    diff = list(difflib.unified_diff(old_sents, new_sents, lineterm="", n=2))
    changed = "\n".join(l for l in diff if l.startswith(("+", "-")) and not l.startswith(("---", "+++")))
    return changed[:max_chars] if changed else new[:max_chars]


FALLBACK_CATEGORIES = {
    "pric": "Pricing",
    "plan": "Pricing",
    "subscription": "Pricing",
    "tier": "Pricing",
    "feature": "Product/Feature",
    "launch": "Product/Feature",
    "product": "Product/Feature",
    "hire": "Hiring",
    "job": "Hiring",
    "career": "Hiring",
    "position": "Hiring",
    "ceo": "Leadership",
    "cto": "Leadership",
    "founder": "Leadership",
    "appointed": "Leadership",
    "blog": "Content/Messaging",
    "announce": "Content/Messaging",
    "partner": "Content/Messaging",
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

    llm = _get_llm()
    if llm is None:
        cat = _keyword_classify(diff)
        return {
            "category": cat,
            "summary": f"Content changed on {competitor_name}'s {section} page. LLM analysis unavailable — set LLM_ENABLED=true and ensure model is downloaded.",
            "impact_score": 5,
            "impact_justification": "Default score (LLM offline).",
            "strategic_action": "Review the change manually and assess strategic impact.",
        }

    profile_ctx = "\n".join([
        f"Company: {business_profile.get('company_name', 'Unknown')}",
        f"Industry: {business_profile.get('industry', 'Unknown')}",
        f"Target Market: {business_profile.get('target_market', '')}",
        f"Differentiator: {business_profile.get('main_differentiator', '')}",
        f"Competitor Context: {business_profile.get('key_competitors_context', '')}",
    ])

    system_msg = (
        "You are a competitive intelligence analyst. Respond ONLY with a valid JSON object, "
        "no markdown, no prose before or after."
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
  "summary": "<one paragraph plain-English explanation of the change and its significance>",
  "impact_score": <integer 1-10>,
  "impact_justification": "<one sentence explaining the score relative to the business context above>",
  "strategic_action": "<one concrete recommended action>"
}}"""

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user",   "content": user_msg},
                ],
                max_tokens=512,
                temperature=0.1,
                stop=["```"],
            ),
        )
        raw = result["choices"][0]["message"]["content"].strip()
        # Extract JSON even if model added surrounding text
        start, end = raw.find("{"), raw.rfind("}") + 1
        parsed = json.loads(raw[start:end])
        parsed["impact_score"] = max(1, min(10, int(parsed.get("impact_score", 5))))
        valid_cats = {"Pricing", "Product/Feature", "Hiring", "Content/Messaging", "Leadership", "Other"}
        if parsed.get("category") not in valid_cats:
            parsed["category"] = "Other"
        return parsed
    except Exception as e:
        logger.error(f"LLM inference/parse error: {e}")
        cat = _keyword_classify(diff)
        return {
            "category": cat,
            "summary": f"Change detected on {competitor_name}'s {section}. AI analysis failed — raw diff stored.",
            "impact_score": 5,
            "impact_justification": "Default score due to analysis error.",
            "strategic_action": "Review manually.",
        }
