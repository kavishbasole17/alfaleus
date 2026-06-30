import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH               = os.getenv("DB_PATH", "./data/alfaleus.db")
API_KEY               = os.getenv("API_KEY", "change-me-in-production")
PORT                  = int(os.getenv("PORT", "8000"))

SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "360"))
SEMANTIC_THRESHOLD    = float(os.getenv("SEMANTIC_THRESHOLD", "0.15"))

EMBEDDINGS_CACHE_DIR  = os.getenv("EMBEDDINGS_CACHE_DIR", "/app/data/models")
SCREENSHOT_DIR        = os.getenv("SCREENSHOT_DIR", "/app/data/screenshots")
SCREENSHOTS_ENABLED   = os.getenv("SCREENSHOTS_ENABLED", "true").lower() == "true"

APP_URL               = os.getenv("APP_URL", "")
CORS_ORIGINS          = os.getenv("CORS_ORIGINS", "http://localhost:5173")
