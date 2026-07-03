# Alfaleus — Competitor Intelligence System

Alfaleus is a fully automated competitor monitoring platform. It watches competitor websites for meaningful changes, classifies them with a local LLM, scores their business impact, syncs intelligence cards to your CRM, delivers weekly email digests, and surfaces everything through a React dashboard and a Chrome extension — all deployable for under $10/month.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [How It Works — Change Detection Pipeline](#how-it-works--change-detection-pipeline)
- [Memory Budget](#memory-budget)
- [Quick Start — Local Development](#quick-start--local-development)
- [Deployment](#deployment)
  - [Backend → Render](#backend--render)
  - [Frontend → Vercel](#frontend--vercel)
  - [Chrome Extension](#chrome-extension)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [CRM Integration](#crm-integration)
- [Email Digest](#email-digest)
- [Screenshot Archiving](#screenshot-archiving)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Features

| Capability | Detail |
|---|---|
| **Semantic change detection** | fastembed (ONNX) embeds page text; cosine distance filters cosmetic noise from meaningful changes |
| **AI impact scoring** | Local Qwen2.5-0.5B LLM classifies each change and assigns a 1–10 impact score with justification and strategic action |
| **Section-scoped scraping** | Monitor a competitor's full site, pricing page, or careers section independently |
| **CRM sync** | Pushes intelligence cards to Notion or Airtable with idempotent retry queue |
| **Weekly email digest** | Rich HTML digest grouped by competitor, sorted by impact score, with top-pick highlights |
| **Chrome Extension (MV3)** | One-click page tracking directly from the browser; badge auto-updates with unread count |
| **React dashboard** | Dashboard with charts, intelligence feed, competitor detail views, and onboarding flow |
| **Screenshot archive** | Playwright captures a full-viewport screenshot at every detected change |
| **Zero cold-start cost** | Runs on Render Starter ($7/mo) + Vercel Free + local extension — no hosted LLM API costs |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Alfaleus                              │
│                                                              │
│  Chrome Extension (MV3)                                      │
│       │  Track page / read badge                             │
│       ▼                                                      │
│  React Frontend (Vite) ──────────────────────────────────►  │
│       │  Dashboard / Feed / Settings      Vercel (Free)      │
│       ▼                                                      │
│  FastAPI Backend ──────────────────────────────────────────► │
│       │  REST API + APScheduler           Render Starter      │
│       ├── SQLite (aiosqlite)                                 │
│       ├── httpx + BeautifulSoup  (scraping)                  │
│       ├── fastembed ONNX         (semantic similarity)       │
│       ├── llama-cpp Qwen2.5-0.5B (impact scoring)           │
│       ├── Playwright             (screenshots)               │
│       ├── Notion / Airtable API  (CRM sync)                 │
│       └── Gmail SMTP             (digest email)              │
└──────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Deployment |
|---|---|---|
| Backend API | Python 3.11 + FastAPI | Render Starter ($7/mo) |
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

## How It Works — Change Detection Pipeline

Every scheduled or manual scrape runs through this pipeline:

```
1.  httpx fetches the URL with real browser User-Agent headers
2.  BeautifulSoup strips noise (scripts, nav, footer, SVG) and extracts
    section-scoped text — full page, pricing section, or careers section
3.  fastembed (ONNX) computes a 384-dim embedding for the new text
4.  Cosine distance is calculated against the stored previous embedding
5.  distance < SEMANTIC_THRESHOLD  →  cosmetic change, skip
    distance ≥ SEMANTIC_THRESHOLD  →  significant change, continue
6.  unified_diff extracts the human-readable diff (capped at 3,000 chars)
7.  Qwen2.5-0.5B classifies the diff and outputs structured JSON:
      { category, summary, impact_score (1–10), justification, action }
8.  Playwright captures a full-viewport screenshot of the current page
9.  Change record is written to SQLite
10. Record is queued for CRM sync (Notion or Airtable)
```

**Fallback:** If `LLM_ENABLED=false`, step 7 uses keyword-based classification — zero LLM overhead, sub-second response.

---

## Memory Budget

Render Starter provides **512 MB RAM**. The LLM and embedding model are never simultaneously at peak load:

| Component | RAM |
|---|---|
| FastAPI + deps + SQLite | ~60 MB |
| fastembed (bge-small-en-v1.5 ONNX) | ~80 MB |
| Qwen2.5-0.5B-Instruct Q4_K_M (peak, on-demand) | ~400 MB |
| **Total peak** | **~540 MB** |

> The LLM is loaded on demand per analysis and unloaded after. If you hit OOM, set `LLM_ENABLED=false` to drop to ~140 MB total. For a comfortable baseline, **Render Standard ($25/mo)** gives 2 GB RAM.

### AI Model Details

| | Embedding Model | LLM |
|---|---|---|
| **Model** | BAAI/bge-small-en-v1.5 | Qwen2.5-0.5B-Instruct-Q4_K_M.gguf |
| **Library** | fastembed (ONNX — no PyTorch) | llama-cpp-python |
| **Disk** | ~33 MB | ~354 MB |
| **RAM** | ~80 MB | ~400 MB peak |
| **Inference time** | <100 ms | 30–90 s (1 vCPU) |
| **Why** | Zero PyTorch dep; fast ONNX; strong semantic quality | Smallest model with reliable structured JSON output; best quality/size at Q4_K_M |

Both models download automatically to `/app/data/models/` on first startup and are cached on the Render persistent disk.

---

## Quick Start — Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### 1. Clone and configure

```bash
git clone https://github.com/your-username/alfaleus2.git
cd alfaleus2
cp .env.example backend/.env
# Edit backend/.env and fill in your values
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt

# llama-cpp-python requires a separate install for CPU builds:
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu

python main.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 3. Start the frontend

Open a new terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000 in .env.local
npm run dev
# App running at http://localhost:5173
```

### 4. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Click the extension icon → **⚙ Settings** → enter `http://localhost:8000` and your `API_KEY`

---

## Deployment

### Backend → Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect your repo
3. Render auto-detects `render.yaml` — click **Apply**
4. Add a **Disk** (5 GB, mount path `/app/data`) in the service dashboard
5. Set optional environment variables (SMTP, Notion/Airtable) under **Environment**
6. The `API_KEY` is auto-generated — copy it from Render env vars for the extension and API clients
7. First deploy takes 5–10 minutes (installs llama-cpp-python and Playwright Chromium)

### Frontend → Vercel

```bash
cd frontend
npm i -g vercel
vercel
# When prompted, set VITE_API_URL=https://your-render-service.onrender.com
vercel --prod
```

Or import via the Vercel dashboard: **New Project** → **Import Git Repository** → set **Root Directory** to `frontend`.

**Required environment variable in Vercel:**
```
VITE_API_URL=https://your-app.onrender.com
```

### Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Click the Alfaleus icon → **⚙ Settings**
5. Enter your **Backend API URL** (Render URL) and **API Key**
6. Navigate to any competitor page → click the extension → fill in the form → **Track This Page**
7. The badge auto-updates every 5 minutes with your unread intelligence count

To distribute the extension, zip the `extension/` folder and load it as an unpacked extension — no Chrome Web Store submission required for internal use.

---

## Environment Variables

### Backend (`backend/.env` or Render Environment)

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `8000` | No | Server port |
| `DB_PATH` | `/app/data/alfaleus.db` | No | SQLite database path |
| `API_KEY` | *(auto)* | **Yes** | Secret key for extension and API auth |
| `LLM_ENABLED` | `true` | No | Set `false` to disable LLM and save ~400 MB RAM |
| `SCREENSHOTS_ENABLED` | `true` | No | Set `false` to skip Playwright screenshots |
| `SEMANTIC_THRESHOLD` | `0.15` | No | Cosine distance threshold (0–1). Lower = more sensitive |
| `SCRAPE_INTERVAL_MINUTES` | `360` | No | Minimum minutes between scrapes per competitor |
| `CORS_ORIGINS` | `*` | No | Comma-separated allowed origins |
| `APP_URL` | *(empty)* | No | Your Vercel URL — included in digest email CTA |
| `CRM_PROVIDER` | `notion` | No | `notion` or `airtable` |
| `NOTION_TOKEN` | *(empty)* | CRM | Notion integration token (`secret_…`) |
| `NOTION_DB_ID` | *(empty)* | CRM | 32-character Notion database ID |
| `AIRTABLE_TOKEN` | *(empty)* | CRM | Airtable personal access token (`patXXX…`) |
| `AIRTABLE_BASE_ID` | *(empty)* | CRM | Airtable base ID (`appXXX…`) |
| `AIRTABLE_TABLE` | `Intelligence` | No | Airtable table name |
| `SMTP_USER` | *(empty)* | Email | Gmail sender address |
| `SMTP_PASS` | *(empty)* | Email | Gmail App Password (16-char, no spaces) |
| `DIGEST_TO` | *(empty)* | Email | Recipient email address for weekly digest |
| `DIGEST_CRON` | `0 8 * * 1` | No | Cron expression for digest schedule (default: Monday 8 AM UTC) |

### Frontend (`frontend/.env.local` or Vercel)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full Render backend URL, e.g. `https://alfaleus-api.onrender.com` |

---

## API Reference

All endpoints require the `X-API-Key` header (or `api_key` query param) matching your `API_KEY` env var.

### Competitors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/competitors` | List all competitors |
| `POST` | `/api/competitors` | Add a competitor (triggers baseline scrape) |
| `GET` | `/api/competitors/:id` | Get competitor details |
| `PUT` | `/api/competitors/:id` | Update competitor (name, section, interval, status) |
| `DELETE` | `/api/competitors/:id` | Delete competitor and all history |
| `POST` | `/api/competitors/:id/scrape` | Trigger an immediate full pipeline run |

**Add competitor request body:**
```json
{
  "name": "Acme Corp",
  "url": "https://acme.com",
  "section": "full",
  "check_interval": 360
}
```
`section` options: `full` · `pricing` · `careers`

### Intelligence Changes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/changes` | List intelligence cards — supports `?competitor_id=`, `?category=`, `?unread_only=true` |
| `GET` | `/api/changes/unread-count` | Badge count for Chrome extension |
| `GET` | `/api/changes/:id` | Get a single change card |
| `PATCH` | `/api/changes/:id/read` | Mark a card as read |
| `PATCH` | `/api/changes/mark-all-read` | Mark all cards as read |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Get all settings (secrets masked) |
| `GET` | `/api/settings/profile` | Get business profile |
| `POST` | `/api/settings/onboarding` | Save onboarding and settings data |
| `GET` | `/api/settings/onboarding-status` | Check whether onboarding is complete |

### CRM

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/crm/status` | CRM queue breakdown (pending / processing / done / failed) |
| `POST` | `/api/crm/retry` | Retry all failed CRM syncs |
| `POST` | `/api/crm/sync/:change_id` | Manually sync a specific change |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health + LLM model status |

---

## CRM Integration

Intelligence cards are pushed to Notion or Airtable automatically after each detection. Both integrations are idempotent — the change ID is embedded in the record name, and the system queries for an existing record before creating a new one, preventing duplicates even after retries.

**Retry queue:** Failed pushes track status (`pending → processing → done / failed`) and are retried up to 5 times. Trigger a retry sweep from the Settings page or via `POST /api/crm/retry`.

### Notion Setup

1. Create an integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a database with these properties:

   | Property | Type |
   |---|---|
   | `Name` | Title |
   | `URL` | URL |
   | `Category` | Select |
   | `Impact Score` | Number |
   | `Summary` | Text |
   | `Strategic Action` | Text |
   | `Detected At` | Date |
   | `Change ID` | Text |

3. Open the database → **Share** → invite your integration
4. Copy the **Integration Token** and **Database ID** → paste into the Alfaleus Settings page

### Airtable Setup

1. Create a base at [airtable.com](https://airtable.com) and add a table named `Intelligence` with columns matching the Notion schema above
2. Generate a Personal Access Token at [airtable.com/create/tokens](https://airtable.com/create/tokens) with `data.records:write` scope
3. Copy the **Token** and **Base ID** → paste into the Alfaleus Settings page

---

## Email Digest

- Sent on a cron schedule — default: **every Monday at 8:00 AM UTC** (configurable via `DIGEST_CRON`)
- Groups intelligence cards by competitor, sorted by Impact Score descending
- Highlights the top 3 picks across all competitors
- Skips sending if no new changes have been detected since the last digest
- Delivered via Gmail SMTP with App Password — no paid email API required

**How to get a Gmail App Password:**
1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a password for "Mail" → copy the 16-character code into `SMTP_PASS`

---

## Screenshot Archiving

Playwright captures a full-viewport screenshot immediately before each change is recorded. Screenshots are:

- Stored at `/app/data/screenshots/` on the Render persistent disk
- Served via `/api/screenshots/{filename}`
- Linked inside the intelligence card detail modal as **"View Screenshot"**
- Named using the pattern `{competitor_id}_{type}_{timestamp}.png`

Set `SCREENSHOTS_ENABLED=false` to disable Playwright entirely if memory is constrained.

---

## Project Structure

```
alfaleus2/
├── backend/                    # FastAPI application → Render
│   ├── main.py                 # App entrypoint, lifespan, CORS, router registration
│   ├── config.py               # Environment variable loading
│   ├── database.py             # SQLite schema + async connection pool
│   ├── models.py               # Pydantic request/response schemas
│   ├── scheduler.py            # APScheduler (scrape loop, CRM queue, digest)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── competitors.py      # Competitor CRUD + scrape pipeline trigger
│   │   ├── changes.py          # Intelligence feed endpoints
│   │   ├── settings.py         # Onboarding and business profile
│   │   └── crm.py              # CRM queue status and retry
│   └── services/
│       ├── scraper.py          # httpx fetch + BeautifulSoup section extraction
│       ├── embeddings.py       # fastembed cosine similarity (ONNX)
│       ├── llm.py              # llama-cpp-python + auto model download
│       ├── crm.py              # Notion + Airtable push with idempotency
│       ├── email_digest.py     # HTML digest builder + Gmail SMTP sender
│       └── screenshot.py       # Playwright full-viewport capture
│
├── frontend/                   # React 18 + Vite → Vercel
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── api/index.js        # Typed fetch client for all backend endpoints
│       ├── context/AppContext.jsx
│       ├── styles/globals.css
│       ├── components/         # Sidebar, Topbar, Cards, Modals, OnboardingFlow
│       └── pages/              # Dashboard, Feed, CompetitorDetail, Settings
│
├── extension/                  # Chrome Extension MV3 (no build step needed)
│   ├── manifest.json
│   ├── popup.html / popup.js   # One-click page tracking UI
│   ├── settings.html / settings.js  # API URL + key configuration
│   ├── background.js           # Service worker + 5-minute badge polling
│   └── icons/
│
├── .env.example                # Environment variable template
├── render.yaml                 # Render IaC (web service + disk)
├── Dockerfile                  # Alternative Docker deployment
└── README.md
```

---

## Troubleshooting

**LLM is slow on first request**
The model loads into RAM on the first inference after startup. Subsequent calls within the same process are faster. This is expected behavior — Render keeps the process alive between requests.

**Out of Memory on Render**
- Upgrade to Render Starter ($7/mo) for 512 MB or Render Standard ($25/mo) for 2 GB
- Set `LLM_ENABLED=false` + `SCREENSHOTS_ENABLED=false` to run the full stack under 200 MB

**No changes detected despite the page visibly changing**
- Lower `SEMANTIC_THRESHOLD` (e.g., `0.08`) to increase sensitivity
- Check the competitor's `last_checked` timestamp — the check interval may not have elapsed yet
- Trigger a manual scrape immediately via `POST /api/competitors/:id/scrape`

**CRM sync failing**
- Verify your token hasn't expired or been revoked
- Notion: confirm the database is shared with your integration (Share → Invite)
- Airtable: confirm the PAT has `data.records:write` scope on the correct base
- Check `GET /api/crm/status` for pending/failed counts and `POST /api/crm/retry` to reprocess

**Extension badge not updating**
- Open extension Settings and verify the API URL (no trailing slash) and API Key match your Render deployment
- Check that your Render service is awake (free tier sleeps after inactivity — Starter tier stays awake)
