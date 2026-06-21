import sqlite3
from pathlib import Path

from app.config import settings


def get_db_path() -> str:
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return url[len("sqlite:///"):]
    return url


def get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                site_url TEXT,
                description TEXT,
                icon_url TEXT,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                refresh_interval INTEGER NOT NULL DEFAULT 30,
                error_count INTEGER NOT NULL DEFAULT 0,
                last_fetched_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
                guid TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT,
                author TEXT,
                summary TEXT,
                content TEXT,
                image_url TEXT,
                published_at TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                read_at TEXT,
                is_saved INTEGER NOT NULL DEFAULT 0,
                is_starred INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_guid ON articles(feed_id, guid);
            CREATE INDEX IF NOT EXISTS idx_articles_feed_published ON articles(feed_id, published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_articles_read_published ON articles(is_read, published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_articles_saved ON articles(is_saved, published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_articles_starred ON articles(is_starred, published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_feeds_category ON feeds(category_id);

            CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
                title, summary, content, content=articles, content_rowid=id
            );

            CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
                INSERT INTO articles_fts(rowid, title, summary, content)
                VALUES (new.id, new.title, new.summary, new.content);
            END;

            CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
                INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
                VALUES ('delete', old.id, old.title, old.summary, old.content);
            END;

            CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
                INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
                VALUES ('delete', old.id, old.title, old.summary, old.content);
                INSERT INTO articles_fts(rowid, title, summary, content)
                VALUES (new.id, new.title, new.summary, new.content);
            END;

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS invite_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL UNIQUE,
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
        """)
        cursor = conn.execute("PRAGMA table_info(invite_tokens)")
        cols = [r["name"] for r in cursor.fetchall()]
        if "expires_at" not in cols:
            conn.execute("ALTER TABLE invite_tokens ADD COLUMN expires_at TEXT NOT NULL DEFAULT (datetime('now', '+7 days'))")
        cursor = conn.execute("PRAGMA table_info(articles)")
        cols = [r["name"] for r in cursor.fetchall()]
        if "read_at" not in cols:
            conn.execute("ALTER TABLE articles ADD COLUMN read_at TEXT")
        conn.commit()
    finally:
        conn.close()
