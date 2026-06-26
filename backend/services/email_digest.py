import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("email_digest")


def _score_color(score: Optional[int]) -> str:
    if not score:        return "#6a6a6a"
    if score <= 3:       return "#1db954"
    if score <= 6:       return "#f59b23"
    if score <= 8:       return "#e05c2b"
    return "#e22134"


def _category_color(cat: Optional[str]) -> str:
    colors = {
        "Pricing": "#1db954",
        "Product/Feature": "#509bf5",
        "Hiring": "#f59b23",
        "Content/Messaging": "#b450f5",
        "Leadership": "#e22134",
        "Other": "#6a6a6a",
    }
    return colors.get(cat or "Other", "#6a6a6a")


def _card_html(change: dict, highlight: bool = False) -> str:
    score = change.get("impact_score")
    cat = change.get("category") or "Other"
    border = "3px solid #1db954" if highlight else "1px solid #333"
    return f"""
    <div style="background:#242424;border:{border};border-radius:8px;padding:20px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:6px;background:rgba(0,0,0,0.3);
                    display:flex;align-items:center;justify-content:center;
                    color:{_score_color(score)};font-size:18px;font-weight:900;">{score or "–"}</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff;">{change.get('competitor_name','Unknown')}</div>
          <span style="background:rgba(255,255,255,0.08);border-radius:20px;padding:2px 10px;
                       font-size:11px;font-weight:700;color:{_category_color(cat)};text-transform:uppercase;
                       letter-spacing:.5px;">{cat}</span>
        </div>
        {('<span style="background:#1db954;color:#000;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:900;margin-left:auto;">TOP PICK</span>' if highlight else '')}
      </div>
      <p style="font-size:14px;color:#b3b3b3;line-height:1.6;margin:0 0 10px;">{change.get('summary','')}</p>
      {(f'<div style="color:#1db954;font-size:13px;font-weight:600;">→ {change["strategic_action"]}</div>' if change.get('strategic_action') else '')}
    </div>"""


def build_digest_html(changes: list, base_url: str = "") -> str:
    if not changes:
        return ""

    # Group by competitor
    by_comp: dict = {}
    for ch in changes:
        name = ch.get("competitor_name", "Unknown")
        by_comp.setdefault(name, []).append(ch)

    # Sort each group by score DESC
    for k in by_comp:
        by_comp[k].sort(key=lambda x: x.get("impact_score") or 0, reverse=True)

    # Top 3 across all
    top3_ids = {c["id"] for c in sorted(changes, key=lambda x: x.get("impact_score") or 0, reverse=True)[:3]}

    now = datetime.now(timezone.utc).strftime("%B %d, %Y")
    cards_html = ""
    for comp_name, comp_changes in sorted(by_comp.items()):
        cards_html += f"""
        <h3 style="font-size:14px;font-weight:700;color:#fff;margin:24px 0 8px;
                   text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #333;
                   padding-bottom:8px;">{comp_name}</h3>"""
        for ch in comp_changes:
            cards_html += _card_html(ch, highlight=ch["id"] in top3_ids)

    cta = f'<a href="{base_url}" style="display:inline-block;background:#1db954;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">View Full Intelligence Feed</a>' if base_url else ""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#121212;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">

  <div style="margin-bottom:32px;">
    <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-bottom:4px;">
      alfa<span style="color:#1db954;">leus</span>
    </div>
    <div style="font-size:13px;color:#6a6a6a;">Competitor Intelligence Digest — {now}</div>
  </div>

  <div style="background:#1db954;border-radius:8px;padding:20px;margin-bottom:28px;">
    <div style="font-size:28px;font-weight:900;color:#000;">{len(changes)}</div>
    <div style="font-size:14px;font-weight:600;color:#000;">new intelligence cards across {len(by_comp)} competitor{"s" if len(by_comp) != 1 else ""}</div>
  </div>

  {cards_html}

  <div style="margin-top:32px;text-align:center;">
    {cta}
  </div>

  <div style="margin-top:32px;padding-top:24px;border-top:1px solid #333;font-size:12px;color:#6a6a6a;text-align:center;">
    You're receiving this because you configured Alfaleus to send weekly digests.
  </div>
</div>
</body>
</html>"""


async def send_digest(changes: list, settings: dict, base_url: str = ""):
    smtp_user = settings.get("smtp_user", "")
    smtp_pass = settings.get("smtp_pass", "")
    digest_to  = settings.get("digest_to", "")

    if not smtp_user or not smtp_pass or not digest_to:
        logger.warning("Email not configured — skipping digest")
        return False
    if not changes:
        logger.info("No new changes — skipping digest")
        return False

    html = build_digest_html(changes, base_url)
    now = datetime.now(timezone.utc).strftime("%B %d, %Y")
    subject = f"Alfaleus Digest: {len(changes)} new intelligence cards — {now}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_user
    msg["To"]      = digest_to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        import aiosmtplib
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=smtp_user,
            password=smtp_pass,
        )
        logger.info(f"Digest sent to {digest_to} ({len(changes)} cards)")
        return True
    except Exception as e:
        logger.error(f"Digest email failed: {e}")
        return False
