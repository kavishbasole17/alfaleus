import aiosqlite
import os
from contextlib import asynccontextmanager
from config import DB_PATH


def _ensure_dir():
    dirpath = os.path.dirname(os.path.abspath(DB_PATH))
    os.makedirs(dirpath, exist_ok=True)


@asynccontextmanager
async def get_db():
    _ensure_dir()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        yield db


async def init_db():
    _ensure_dir()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            PRAGMA journal_mode=WAL;
            PRAGMA foreign_keys=ON;

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS competitors (
                id               TEXT PRIMARY KEY,
                name             TEXT NOT NULL,
                url              TEXT NOT NULL UNIQUE,
                section          TEXT NOT NULL DEFAULT 'full',
                status           TEXT NOT NULL DEFAULT 'active',
                last_checked     TEXT,
                check_interval   INTEGER NOT NULL DEFAULT 360,
                weekly_changes   INTEGER NOT NULL DEFAULT 0,
                error_message    TEXT,
                created_at       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS page_snapshots (
                id              TEXT PRIMARY KEY,
                competitor_id   TEXT NOT NULL,
                content_text    TEXT NOT NULL,
                content_hash    TEXT NOT NULL,
                embedding       TEXT,
                scraped_at      TEXT NOT NULL,
                screenshot_path TEXT,
                FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS changes (
                id                   TEXT PRIMARY KEY,
                competitor_id        TEXT NOT NULL,
                category             TEXT,
                summary              TEXT,
                impact_score         INTEGER,
                impact_justification TEXT,
                strategic_action     TEXT,
                diff_link            TEXT,
                is_read              INTEGER NOT NULL DEFAULT 0,
                crm_synced           INTEGER NOT NULL DEFAULT 0,
                crm_record_id        TEXT,
                snapshot_before_id   TEXT,
                snapshot_after_id    TEXT,
                created_at           TEXT NOT NULL,
                FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crm_queue (
                id            TEXT PRIMARY KEY,
                change_id     TEXT NOT NULL,
                status        TEXT NOT NULL DEFAULT 'pending',
                attempts      INTEGER NOT NULL DEFAULT 0,
                last_attempt  TEXT,
                error_message TEXT,
                created_at    TEXT NOT NULL,
                FOREIGN KEY (change_id) REFERENCES changes(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_changes_competitor ON changes(competitor_id);
            CREATE INDEX IF NOT EXISTS idx_changes_created    ON changes(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_snapshots_comp     ON page_snapshots(competitor_id);
            CREATE INDEX IF NOT EXISTS idx_crm_status         ON crm_queue(status);
        """)
        await db.commit()
