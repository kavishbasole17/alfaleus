# Alfaleus — Competitor Intelligence System

Fully automated competitor monitoring: semantic change detection, AI impact scoring, CRM sync, digest emails, and a Chrome extension. Backend on Render, frontend on Vercel.

---

## Architecture

| Layer | Technology | Deployment |
|---|---|---|
| Backend API | Python 3.11 + FastAPI | Render (Starter $7/mo) |
| Database | SQLite via aiosqlite | Render persistent disk |
| Scraping | httpx + BeautifulSoup4 | In-process |
| Semantic Embeddings | fastembed · BAAI/bge-small-en-v1.5 (ONNX) | In-process |
| LLM Impact Scoring | llama-cpp-python · Qwen2.5-0.5B-Instruct Q4_K_M | In-process, CPU |
| Scheduler | APScheduler (async, in-process) | In-process |
| Frontend | React 18 + Vite | Vercel (Free) |
| CRM Sync | Notion API or Airtable API | HTTP |
| Email Digest | Gmail SMTP + aiosmtplib | SMTP |
| Screenshot Archive | Playwright (Chromium headless) | In-process |
| Chrome Extension | MV3 unpacked (no build step) | Local |

---

## Memory Budget (Render Starter — 512MB)

| Component | RAM |
|---|---|
| FastAPI + deps + SQLite | ~60 MB |
| fastembed (bge-small-en-v1.5 ONNX) | ~80 MB |
| Qwen2.5-0.5B-Instruct Q4_K_M | ~400 MB peak (loaded on demand) |
| **Total peak** | **~540 MB** |

> **Note:** The LLM and embedding model are never in memory simultaneously at peak load. The LLM loads on demand for each analysis. If you hit OOM issues, set `LLM_ENABLED=false` and the system falls back to keyword-based classification with no LLM overhead.
>
> For comfort, use **Render Standard ($25/mo)** which provides 2GB RAM.

### LLM Model Details

| | |
|---|---|
| **Model** | Qwen2.5-0.5B-Instruct-Q4_K_M.gguf |
| **Source** | `Qwen/Qwen2.5-0.5B-Instruct-GGUF` on Hugging Face |
| **Disk size** | ~354 MB |
| **RAM at inference** | ~400 MB peak |
| **Inference time (1 vCPU)** | 30–90 seconds |
| **Why this model** | Smallest instruction-tuned model with reliable structured JSON output. Q4_K_M provides best quality/size tradeoff for CPU-only inference under 1GB RAM. |

Model downloads automatically to `/app/data/models/` on first startup and is cached to the Render persistent disk.

### Embeddings Model Details

| | |
|---|---|
| **Model** | BAAI/bge-small-en-v1.5 |
| **Library** | fastembed (ONNX runtime — no PyTorch) |
| **Disk size** | ~33 MB |
| **RAM** | ~80 MB |
| **Why** | Zero PyTorch dependency, fast ONNX inference, excellent semantic similarity quality |

---

## Quick Start (Local Dev)

```bash
# 1. Backend
cp .env.example backend/.env
cd backend
pip install -r requirements.txt
# llama-cpp-python needs a special install:
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
python main.py   # runs on http://localhost:8000

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local
# VITE_API_URL=http://localhost:8000
npm run dev      # runs on http://localhost:5173
```

---

## Deploy: Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → Connect your repo
3. Render auto-detects `render.yaml` — click **Apply**
4. Add a **Disk** (5GB, mount `/app/data`) in the service settings
5. In **Environment**, set any optional vars (SMTP, Notion, etc.)
6. The `API_KEY` is auto-generated — copy it from Render env vars
7. First deploy takes ~5–10 min (installs llama-cpp-python + Playwright)

---

## Deploy: Frontend → Vercel

```bash
cd frontend
npm i -g vercel
vercel
# Set VITE_API_URL = https://your-render-service.onrender.com
vercel --prod
```

Or link via Vercel dashboard → Import Git Repository → set `Root Directory` = `frontend`.

**Required Vercel env var:**
```
VITE_API_URL=https://your-app.onrender.com
```

---

## Chrome Extension Setup

1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Click the Alfaleus icon → **⚙ Settings**
5. Paste your **Backend API URL** (Render URL) and **API Key** (from Render env)
6. Visit any competitor page → click extension → fill form → **Track This Page**
7. Badge auto-updates every 5 minutes with unread count

---

## Environment Variables

### Backend (Render)

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `8000` | No | Server port |
| `DB_PATH` | `/app/data/alfaleus.db` | No | SQLite path |
| `API_KEY` | auto | **Yes** | Extension + API auth key |
| `LLM_ENABLED` | `true` | No | Disable to save ~400MB RAM |
| `SCREENSHOTS_ENABLED` | `true` | No | Disable to save Playwright overhead |
| `SEMANTIC_THRESHOLD` | `0.15` | No | Cosine distance threshold (0–1). Higher = stricter |
| `SCRAPE_INTERVAL_MINUTES` | `360` | No | Global minimum between scrapes |
| `CORS_ORIGINS` | `*` | No | Comma-separated allowed origins |
| `APP_URL` | `` | No | Vercel URL (included in digest emails) |
| `CRM_PROVIDER` | `notion` | No | `notion` or `airtable` |
| `NOTION_TOKEN` | `` | CRM | Integration token (`secret_…`) |
| `NOTION_DB_ID` | `` | CRM | 32-char database ID |
| `AIRTABLE_TOKEN` | `` | CRM | Personal access token |
| `AIRTABLE_BASE_ID` | `` | CRM | Base ID (`app…`) |
| `AIRTABLE_TABLE` | `Intelligence` | CRM | Table name |
| `SMTP_USER` | `` | Email | Gmail sender address |
| `SMTP_PASS` | `` | Email | Gmail App Password |
| `DIGEST_TO` | `` | Email | Recipient address |

### Frontend (Vercel)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full Render backend URL, e.g. `https://alfaleus-api.onrender.com` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health + LLM status |
| GET | `/api/competitors` | List all competitors |
| POST | `/api/competitors` | Add competitor (triggers baseline scrape) |
| GET | `/api/competitors/:id` | Get competitor details |
| PUT | `/api/competitors/:id` | Update competitor |
| DELETE | `/api/competitors/:id` | Delete competitor + all history |
| POST | `/api/competitors/:id/scrape` | Trigger manual full pipeline |
| GET | `/api/changes` | List intelligence cards (filter: competitor_id, category, unread_only) |
| GET | `/api/changes/unread-count` | Badge count for extension |
| GET | `/api/changes/:id` | Get single change |
| PATCH | `/api/changes/:id/read` | Mark as read |
| PATCH | `/api/changes/mark-all-read` | Mark all as read |
| GET | `/api/settings` | Get all settings (secrets masked) |
| GET | `/api/settings/profile` | Get business profile |
| POST | `/api/settings/onboarding` | Save onboarding / settings data |
| GET | `/api/settings/onboarding-status` | Check if onboarded |
| GET | `/api/crm/status` | CRM queue status breakdown |
| POST | `/api/crm/retry` | Retry all failed CRM syncs |
| POST | `/api/crm/sync/:change_id` | Manually sync a specific change |

---

## Change Detection Pipeline

```
1. httpx fetches URL with real browser UA headers
2. BeautifulSoup extracts section-scoped text (full / pricing / careers)
3. fastembed computes ONNX embedding for new content
4. Cosine distance vs. previous snapshot embedding
5. If distance < SEMANTIC_THRESHOLD → cosmetic change, skip
6. If distance ≥ SEMANTIC_THRESHOLD → significant change detected
7. unified_diff extracts what actually changed (up to 3,000 chars)
8. Qwen2.5-0.5B LLM classifies and scores the diff
9. JSON output stored: category, summary, impact_score (1-10), justification, action
10. Playwright captures screenshot → /app/data/screenshots/
11. Change record created → queued for CRM sync
```

---

## CRM Sync

Intelligence cards are pushed to Notion or Airtable automatically after detection.

**Idempotency:** Each change has a unique ID embedded in the record name. Before creating, the system queries for an existing record with that ID, preventing duplicates even if the queue is retried.

**Retry queue:** Failed pushes are retried up to 5 times with status tracking (`pending → processing → done/failed`). Retry all failed from the Settings page or via `POST /api/crm/retry`.

### Notion Setup
1. Create an integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a database with these properties:
   - `Name` (Title), `URL` (URL), `Category` (Select), `Impact Score` (Number), `Summary` (Text), `Strategic Action` (Text), `Detected At` (Date), `Change ID` (Text)
3. Share the database with your integration
4. Copy Integration Token + Database ID → Settings page

### Airtable Setup
1. Create base at [airtable.com](https://airtable.com)
2. Add table `Intelligence` with columns matching above
3. Generate Personal Access Token at [airtable.com/create/tokens](https://airtable.com/create/tokens)
4. Copy Token + Base ID → Settings page

---

## Digest Email

- Sent every **Monday at 8:00 AM UTC** (configurable)
- Groups cards by competitor, sorted by Impact Score descending
- Highlights top 3 picks across all competitors
- Skips sending if no new changes since last digest
- Uses Gmail SMTP with App Password (free, no paid API)

**Gmail App Password:** [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — requires 2FA enabled on your Google account.

---

## Screenshot Archiving (Bonus — Day 5)

Before each change is recorded, Playwright captures a full-viewport screenshot of the current page state. Screenshots are:
- Stored at `/app/data/screenshots/` (persisted on Render disk)
- Accessible via `/api/screenshots/{filename}` 
- Linked in the intelligence card detail modal as "View Screenshot"
- Named `{competitor_id}_{type}_{timestamp}.png`

Set `SCREENSHOTS_ENABLED=false` to disable if Playwright causes memory issues.

---

## Project Structure

```
alfaleus2/
├── backend/                   # FastAPI → Render
│   ├── main.py                # App entrypoint, lifespan, CORS, routers
│   ├── config.py              # Env var loading
│   ├── database.py            # SQLite schema + async connection
│   ├── models.py              # Pydantic schemas
│   ├── scheduler.py           # APScheduler (scrape/CRM queue/digest)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── competitors.py     # CRUD + full scrape pipeline
│   │   ├── changes.py         # Intelligence feed endpoints
│   │   ├── settings.py        # Onboarding + profile
│   │   └── crm.py             # Queue status + retry
│   └── services/
│       ├── scraper.py         # httpx + BeautifulSoup fetch
│       ├── embeddings.py      # fastembed cosine similarity
│       ├── llm.py             # llama-cpp-python + model download
│       ├── crm.py             # Notion + Airtable push
│       ├── email_digest.py    # Gmail SMTP digest
│       └── screenshot.py      # Playwright capture
├── frontend/                  # React/Vite → Vercel
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── api/index.js       # Typed fetch client
│       ├── context/AppContext.jsx
│       ├── styles/globals.css
│       ├── components/        # Sidebar, Topbar, Cards, Modals, Onboarding
│       └── pages/             # Dashboard, Feed, CompetitorDetail, Settings
├── extension/                 # Chrome Extension MV3 (no build step)
│   ├── manifest.json
│   ├── popup.html / popup.js
│   ├── settings.html / settings.js
│   ├── background.js          # Service worker + badge polling
│   └── icons/
├── render.yaml                # Render IaC config
├── Dockerfile                 # Alternative Docker deploy
└── README.md
```

---

## Day-by-Day Progress

- [x] **Day 1** — Scaffold, SQLite, FastAPI routing, basic scraper, frontend shell
- [x] **Day 2** — fastembed semantic similarity, `semantic_distance` change detection, scheduler
- [x] **Day 3** — llama-cpp-python Qwen2.5-0.5B, JSON impact scoring, Notion/Airtable CRM with retry queue
- [x] **Day 4** — Gmail digest email, Chrome Extension MV3 with auto badge counter
- [x] **Day 5** — Playwright screenshot archive, React frontend (Vite/Vercel), Render deployment, comprehensive README

---

## Troubleshooting

**LLM is slow / timing out**
- First inference after startup is slow (model loads into RAM). Subsequent calls are faster.
- Set `LLM_ENABLED=false` to use keyword-based fallback classification (instant).

**Out of Memory on Render Free Tier**
- Upgrade to Render Starter ($7/mo) for 512MB, or Standard ($25) for 2GB.
- Set `LLM_ENABLED=false` + `SCREENSHOTS_ENABLED=false` to run under 200MB.

**CRM sync failing**
- Check CRM token hasn't expired.
- Notion: ensure the database is shared with your integration.
- Airtable: ensure PAT has `data.records:write` scope.
- Check `GET /api/crm/status` for pending/failed counts.

**No changes detected despite page changing**
- Lower `SEMANTIC_THRESHOLD` (e.g., `0.08`) to be more sensitive.
- Check `last_checked` on the competitor — interval may not have elapsed yet.
- Trigger a manual scrape via `POST /api/competitors/:id/scrape`.
