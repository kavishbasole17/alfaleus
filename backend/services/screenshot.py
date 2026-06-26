import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger("screenshot")

SCREENSHOT_DIR = os.getenv("SCREENSHOT_DIR", "/app/data/screenshots")
SCREENSHOTS_ENABLED = os.getenv("SCREENSHOTS_ENABLED", "true").lower() == "true"


async def capture(url: str, competitor_id: str, snap_type: str = "after") -> str | None:
    if not SCREENSHOTS_ENABLED:
        return None
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright not installed — screenshot skipped")
        return None

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{competitor_id}_{snap_type}_{ts}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
                headless=True,
            )
            ctx = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            page = await ctx.new_page()
            # Block heavy resources to save memory
            await page.route("**/*.{mp4,webm,ogg,mp3,wav}", lambda r: r.abort())
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.screenshot(path=filepath, full_page=False)
            await browser.close()
        logger.info(f"Screenshot saved: {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Screenshot failed for {url}: {e}")
        return None


def screenshot_url_path(filepath: str) -> str | None:
    if not filepath:
        return None
    filename = os.path.basename(filepath)
    return f"/api/screenshots/{filename}"
