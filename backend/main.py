import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from scheduler import start_scheduler, stop_scheduler
from routers import competitors, changes, settings as settings_router, crm
from services.llm import download_model, model_status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("main")

SCREENSHOT_DIR = os.getenv("SCREENSHOT_DIR", "/app/data/screenshots")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    import asyncio
    asyncio.create_task(download_model())   # non-blocking model download
    start_scheduler()
    logger.info("Alfaleus API started")
    yield
    stop_scheduler()


app = FastAPI(title="Alfaleus API", version="2.0.0", lifespan=lifespan)

# CORS — allow Vercel frontend + localhost dev
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://*.vercel.app",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # restrict to allowed_origins after first deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(competitors.router)
app.include_router(changes.router)
app.include_router(settings_router.router)
app.include_router(crm.router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "llm": model_status(),
    }


# Serve screenshots as static files
if os.path.isdir(SCREENSHOT_DIR):
    app.mount("/api/screenshots", StaticFiles(directory=SCREENSHOT_DIR), name="screenshots")


if __name__ == "__main__":
    import uvicorn
    from config import PORT
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
