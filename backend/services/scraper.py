import httpx
import hashlib
import re
from bs4 import BeautifulSoup
from typing import Optional

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

SECTION_SELECTORS = {
    "pricing": [
        "[class*='pric']", "[id*='pric']",
        "[class*='plan']", "[id*='plan']",
        "[class*='tier']", "[id*='tier']",
        "section:has(h2:contains('Pricing'))",
    ],
    "careers": [
        "[class*='job']", "[id*='job']",
        "[class*='career']", "[id*='career']",
        "[class*='hiring']", "[id*='hiring']",
        "[class*='position']",
    ],
}

NOISE_TAGS = ["script", "style", "nav", "footer", "header", "noscript", "svg", "img"]

async def fetch_page(url: str, section: str = "full") -> dict:
    """
    Fetch a URL and extract clean text content.
    Returns dict with keys: text, hash, title, error.
    """
    try:
        async with httpx.AsyncClient(
            headers=HEADERS,
            follow_redirects=True,
            timeout=30.0,
            verify=False,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

        text = extract_text(html, section)
        return {
            "text": text,
            "hash": hashlib.sha256(text.encode()).hexdigest(),
            "title": extract_title(html),
            "error": None,
        }
    except httpx.HTTPStatusError as e:
        return {"text": "", "hash": "", "title": "", "error": f"HTTP {e.response.status_code}"}
    except httpx.TimeoutException:
        return {"text": "", "hash": "", "title": "", "error": "Timeout after 30s"}
    except Exception as e:
        return {"text": "", "hash": "", "title": "", "error": str(e)[:200]}


def extract_title(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    tag = soup.find("title")
    return tag.get_text(strip=True) if tag else ""


def extract_text(html: str, section: str = "full") -> str:
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(NOISE_TAGS):
        tag.decompose()

    if section in SECTION_SELECTORS:
        target = None
        for sel in SECTION_SELECTORS[section]:
            try:
                target = soup.select_one(sel)
                if target:
                    break
            except Exception:
                continue
        root = target if target else soup.find("main") or soup.find("body") or soup
    else:
        root = soup.find("main") or soup.find("article") or soup.find("body") or soup

    raw = root.get_text(separator=" ", strip=True)
    clean = re.sub(r"\s{2,}", " ", raw).strip()
    return clean[:50_000]
