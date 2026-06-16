# RSS Reader Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully containerized RSS reader with feed management, article reading, categories, search, and OPML import/export.

**Architecture:** FastAPI monolith with APScheduler for background feed refresh. SQLite with WAL mode. React frontend with Zustand + TanStack Query. Single docker-compose deployment.

**Tech Stack:** Python 3.12, FastAPI, SQLite, APScheduler, feedparser, httpx / React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query

---

### Task 1: Backend Scaffold — Config, Database, Main App

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
httpx>=0.28.0
feedparser>=6.0.11
apscheduler>=3.10.4
python-multipart>=0.0.17
pydantic>=2.10.0
pydantic-settings>=2.7.0
```

- [ ] **Step 2: Create config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/rss.db"
    log_level: str = "INFO"
    default_refresh_interval: int = 30

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 3: Create database.py**

```python
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
            is_saved INTEGER NOT NULL DEFAULT 0,
            is_starred INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_feed_guid ON articles(feed_id, guid);
        CREATE INDEX IF NOT EXISTS idx_articles_feed_published ON articles(feed_id, published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_read_published ON articles(is_read, published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_saved ON articles(is_saved, published_at DESC);

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
    """)
    conn.commit()
    conn.close()
```

- [ ] **Step 4: Create main.py**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RSS Reader Pro", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Create __init__.py**

```python
# empty
```

- [ ] **Step 6: Verify backend starts**

Run from `backend/` directory:
```bash
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Expected: Server starts on port 8000. `curl http://localhost:8000/api/v1/health` returns `{"status":"ok"}`.

---

### Task 2: Pydantic Models

**Files:**
- Create: `backend/app/models.py`

- [ ] **Step 1: Create models.py**

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str
    feed_count: int = 0
    created_at: str


class FeedCreate(BaseModel):
    url: str
    category_id: Optional[int] = None


class FeedUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    category_id: Optional[int] = None
    refresh_interval: Optional[int] = None
    enabled: Optional[bool] = None


class FeedOut(BaseModel):
    id: int
    title: str
    url: str
    site_url: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category_id: Optional[int] = None
    enabled: bool
    refresh_interval: int
    error_count: int
    last_fetched_at: Optional[str] = None
    created_at: str


class FeedSummary(BaseModel):
    id: int
    title: str
    icon_url: Optional[str] = None


class ArticleUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_saved: Optional[bool] = None
    is_starred: Optional[bool] = None


class ArticleOut(BaseModel):
    id: int
    feed_id: int
    guid: str
    title: str
    url: Optional[str] = None
    author: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    published_at: Optional[str] = None
    is_read: bool
    is_saved: bool
    is_starred: bool
    created_at: str
    feed: Optional[FeedSummary] = None


class SearchQuery(BaseModel):
    query: str
    page: int = 1
    per_page: int = 50
    feed_id: Optional[int] = None
    category_id: Optional[int] = None
    unread: Optional[bool] = None
    saved: Optional[bool] = None


class StatsOut(BaseModel):
    total_feeds: int
    total_categories: int
    unread_count: int
    read_today: int
    saved_count: int
    starred_count: int


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int
```

---

### Task 3: Categories API

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/categories.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Create routers/__init__.py**

```python
# empty
```

- [ ] **Step 2: Create categories router**

```python
from typing import List

from fastapi import APIRouter, HTTPException
from app.database import get_connection
from app.models import CategoryCreate, CategoryUpdate, CategoryOut

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=List[CategoryOut])
async def list_categories():
    conn = get_connection()
    rows = conn.execute("""
        SELECT c.*, COUNT(f.id) as feed_count
        FROM categories c
        LEFT JOIN feeds f ON f.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(body: CategoryCreate):
    conn = get_connection()
    try:
        cur = conn.execute("INSERT INTO categories (name) VALUES (?)", (body.name.strip(),))
        conn.commit()
        row = conn.execute("""
            SELECT c.*, COUNT(f.id) as feed_count
            FROM categories c
            LEFT JOIN feeds f ON f.category_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        """, (cur.lastrowid,)).fetchone()
        conn.close()
        return dict(row)
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Category already exists")
        raise HTTPException(400, str(e))


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(category_id: int, body: CategoryUpdate):
    conn = get_connection()
    try:
        conn.execute("UPDATE categories SET name = ? WHERE id = ?", (body.name.strip(), category_id))
        conn.commit()
        row = conn.execute("""
            SELECT c.*, COUNT(f.id) as feed_count
            FROM categories c
            LEFT JOIN feeds f ON f.category_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        """, (category_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(404, "Category not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Category name already exists")
        raise HTTPException(400, str(e))


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
```

- [ ] **Step 3: Register router in main.py**

Edit `backend/app/main.py` — add after `app.add_middleware(...)`:

```python
from app.routers.categories import router as categories_router
app.include_router(categories_router)
```

- [ ] **Step 4: Test categories API**

```bash
curl -X POST http://localhost:8000/api/v1/categories -H "Content-Type: application/json" -d '{"name":"Technology"}'
curl http://localhost:8000/api/v1/categories
```

Expected: Category is created and listed.

---

### Task 4: Feeds API

**Files:**
- Create: `backend/app/routers/feeds.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create feeds router**

```python
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from app.database import get_connection
from app.models import FeedCreate, FeedUpdate, FeedOut

router = APIRouter(prefix="/api/v1/feeds", tags=["feeds"])


@router.get("", response_model=List[FeedOut])
async def list_feeds(category_id: Optional[int] = Query(None)):
    conn = get_connection()
    if category_id:
        rows = conn.execute(
            "SELECT * FROM feeds WHERE category_id = ? ORDER BY title", (category_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM feeds ORDER BY title").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("", response_model=FeedOut, status_code=201)
async def create_feed(body: FeedCreate):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO feeds (url, title, category_id) VALUES (?, ?, ?)",
            (body.url, body.url, body.category_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM feeds WHERE id = ?", (cur.lastrowid,)).fetchone()
        conn.close()
        return dict(row)
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Feed URL already exists")
        raise HTTPException(400, str(e))


@router.get("/{feed_id}", response_model=FeedOut)
async def get_feed(feed_id: int):
    conn = get_connection()
    row = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Feed not found")
    return dict(row)


@router.put("/{feed_id}", response_model=FeedOut)
async def update_feed(feed_id: int, body: FeedUpdate):
    conn = get_connection()
    feed = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    if not feed:
        conn.close()
        raise HTTPException(404, "Feed not found")
    feed = dict(feed)
    updates = {}
    for field in ("title", "url", "category_id", "refresh_interval", "enabled"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [feed_id]
        conn.execute(f"UPDATE feeds SET {set_clause} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    conn.close()
    return dict(row)


@router.delete("/{feed_id}", status_code=204)
async def delete_feed(feed_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM feeds WHERE id = ?", (feed_id,))
    conn.commit()
    conn.close()
```

- [ ] **Step 2: Register router in main.py**

```python
from app.routers.feeds import router as feeds_router
app.include_router(feeds_router)
```

---

### Task 5: Fetcher + Parser Services

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/fetcher.py`
- Create: `backend/app/services/parser.py`

- [ ] **Step 1: Create services/__init__.py**

```python
# empty
```

- [ ] **Step 2: Create fetcher.py**

```python
import asyncio
from typing import Optional
import httpx


async def fetch_feed(url: str, timeout: int = 30) -> Optional[bytes]:
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "RSS-Reader-Pro/1.0"})
            resp.raise_for_status()
            return resp.content
    except (httpx.HTTPStatusError, httpx.RequestError, asyncio.TimeoutError):
        return None
```

- [ ] **Step 3: Create parser.py**

```python
from datetime import datetime
from typing import List, Optional
import feedparser


class ParsedArticle:
    def __init__(
        self,
        guid: str,
        title: str,
        url: Optional[str] = None,
        author: Optional[str] = None,
        summary: Optional[str] = None,
        content: Optional[str] = None,
        image_url: Optional[str] = None,
        published_at: Optional[str] = None,
    ):
        self.guid = guid
        self.title = title
        self.url = url
        self.author = author
        self.summary = summary
        self.content = content
        self.image_url = image_url
        self.published_at = published_at


class ParsedFeed:
    def __init__(
        self,
        title: str,
        site_url: Optional[str] = None,
        description: Optional[str] = None,
        icon_url: Optional[str] = None,
        articles: Optional[List[ParsedArticle]] = None,
    ):
        self.title = title
        self.site_url = site_url
        self.description = description
        self.icon_url = icon_url
        self.articles = articles or []


def parse_feed(raw: bytes) -> Optional[ParsedFeed]:
    result = feedparser.parse(raw)
    if result.bozo and not result.entries:
        return None

    feed = result.feed
    title = getattr(feed, "title", "Untitled Feed")
    site_url = getattr(feed, "link", None)
    description = getattr(feed, "subtitle", getattr(feed, "description", None))
    icon_url = None
    if hasattr(feed, "image") and hasattr(feed.image, "href"):
        icon_url = feed.image.href

    articles = []
    for entry in result.entries:
        guid = entry.get("id") or entry.get("link", "")
        title = entry.get("title", "Untitled")
        url = entry.get("link")
        author = None
        if hasattr(entry, "author"):
            author = entry.author
        elif hasattr(entry, "authors") and entry.authors:
            author = entry.authors[0].get("name")
        summary = entry.get("summary", entry.get("description", ""))[:500] if entry.get("summary") or entry.get("description") else None
        content = None
        if hasattr(entry, "content") and entry.content:
            content = entry.content[0].get("value", "")
        image_url = None
        if hasattr(entry, "media_content") and entry.media_content:
            image_url = entry.media_content[0].get("url")
        elif hasattr(entry, "links"):
            for link in entry.links:
                if link.get("type", "").startswith("image/"):
                    image_url = link.get("href")
                    break
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6]).isoformat()
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            published_at = datetime(*entry.updated_parsed[:6]).isoformat()
        articles.append(ParsedArticle(guid, title, url, author, summary, content, image_url, published_at))

    return ParsedFeed(title, site_url, description, icon_url, articles)
```

---

### Task 6: Scheduler Service + Feed Refresh

**Files:**
- Create: `backend/app/services/scheduler.py`
- Modify: `backend/app/routers/feeds.py` (add refresh endpoints)
- Modify: `backend/app/main.py` (init scheduler in lifespan)

- [ ] **Step 1: Create scheduler.py**

```python
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import get_connection
from app.services.fetcher import fetch_feed
from app.services.parser import parse_feed

scheduler = AsyncIOScheduler()


async def refresh_feed(feed_id: int):
    conn = get_connection()
    feed = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    if not feed or not feed["enabled"]:
        conn.close()
        return
    feed = dict(feed)
    raw = await fetch_feed(feed["url"])
    if raw is None:
        conn.execute("UPDATE feeds SET error_count = error_count + 1 WHERE id = ?", (feed_id,))
        conn.commit()
        conn.close()
        return
    parsed = parse_feed(raw)
    if parsed is None:
        conn.execute("UPDATE feeds SET error_count = error_count + 1 WHERE id = ?", (feed_id,))
        conn.commit()
        conn.close()
        return
    conn.execute(
        "UPDATE feeds SET title = ?, site_url = ?, description = ?, icon_url = ?, error_count = 0, last_fetched_at = ? WHERE id = ?",
        (parsed.title, parsed.site_url, parsed.description, parsed.icon_url, datetime.utcnow().isoformat(), feed_id),
    )
    for article in parsed.articles:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO articles (feed_id, guid, title, url, author, summary, content, image_url, published_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (feed_id, article.guid, article.title, article.url, article.author,
                 article.summary, article.content, article.image_url, article.published_at),
            )
        except Exception:
            pass
    conn.commit()
    conn.close()


def schedule_feed(feed_id: int, interval_minutes: int):
    scheduler.add_job(
        refresh_feed,
        trigger=IntervalTrigger(minutes=interval_minutes),
        args=[feed_id],
        id=f"feed_{feed_id}",
        replace_existing=True,
    )


def remove_feed_schedule(feed_id: int):
    job_id = f"feed_{feed_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


async def refresh_all_feeds():
    conn = get_connection()
    feeds = conn.execute("SELECT id FROM feeds WHERE enabled = 1").fetchall()
    conn.close()
    for feed in feeds:
        await refresh_feed(feed["id"])


def init_scheduler():
    conn = get_connection()
    feeds = conn.execute("SELECT id, refresh_interval FROM feeds WHERE enabled = 1").fetchall()
    conn.close()
    for feed in feeds:
        schedule_feed(feed["id"], feed["refresh_interval"])
    scheduler.start()
```

- [ ] **Step 2: Add refresh endpoints to feeds router**

Add to `backend/app/routers/feeds.py`:

```python
from fastapi import BackgroundTasks
from app.services.fetcher import fetch_feed
from app.services.parser import parse_feed
from app.services.scheduler import refresh_feed, schedule_feed


@router.post("/{feed_id}/refresh")
async def refresh_single_feed(feed_id: int, background_tasks: BackgroundTasks):
    conn = get_connection()
    feed = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    conn.close()
    if not feed:
        raise HTTPException(404, "Feed not found")
    background_tasks.add_task(refresh_feed, feed_id)
    return {"message": "Refresh started"}


@router.post("/refresh-all")
async def refresh_all(background_tasks: BackgroundTasks):
    from app.services.scheduler import refresh_all_feeds
    background_tasks.add_task(refresh_all_feeds)
    return {"message": "Refresh of all feeds started"}
```

- [ ] **Step 3: Update feed create to fetch metadata immediately + schedule**

Modify create_feed in `backend/app/routers/feeds.py` to accept BackgroundTasks:

```python
@router.post("", response_model=FeedOut, status_code=201)
async def create_feed(body: FeedCreate, background_tasks: BackgroundTasks):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO feeds (url, title, category_id) VALUES (?, ?, ?)",
            (body.url, body.url, body.category_id),
        )
        conn.commit()
        feed_id = cur.lastrowid
        row = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
        conn.close()
        background_tasks.add_task(refresh_feed, feed_id)
        return dict(row)
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Feed URL already exists")
        raise HTTPException(400, str(e))
```

- [ ] **Step 4: Update lifespan in main.py to init scheduler**

```python
from app.services.scheduler import init_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_scheduler()
    yield
    scheduler.shutdown()
```

Make sure to import scheduler at the top:
```python
from app.services.scheduler import scheduler
```

---

### Task 7: Articles API

**Files:**
- Create: `backend/app/routers/articles.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create articles router**

```python
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.database import get_connection
from app.models import ArticleUpdate, ArticleOut, SearchQuery

router = APIRouter(prefix="/api/v1/articles", tags=["articles"])


@router.get("")
async def list_articles(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    feed_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    unread: Optional[bool] = Query(None),
    saved: Optional[bool] = Query(None),
    starred: Optional[bool] = Query(None),
):
    conn = get_connection()
    conditions = []
    params = []
    if feed_id:
        conditions.append("a.feed_id = ?")
        params.append(feed_id)
    if category_id:
        conditions.append("f.category_id = ?")
        params.append(category_id)
    if unread is not None:
        conditions.append("a.is_read = ?")
        params.append(int(unread))
    if saved is not None:
        conditions.append("a.is_saved = ?")
        params.append(int(saved))
    if starred is not None:
        conditions.append("a.is_starred = ?")
        params.append(int(starred))
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    count_row = conn.execute(
        f"SELECT COUNT(*) as cnt FROM articles a JOIN feeds f ON a.feed_id = f.id {where}",
        params,
    ).fetchone()
    total = count_row["cnt"]
    total_pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page

    rows = conn.execute(
        f"""SELECT a.*, f.id as feed__id, f.title as feed__title, f.icon_url as feed__icon_url
            FROM articles a
            JOIN feeds f ON a.feed_id = f.id
            {where}
            ORDER BY a.published_at DESC
            LIMIT ? OFFSET ?""",
        params + [per_page, offset],
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        d = dict(r)
        d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
        items.append(d)
    return {"items": items, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}


@router.get("/{article_id}")
async def get_article(article_id: int):
    conn = get_connection()
    row = conn.execute(
        """SELECT a.*, f.id as feed__id, f.title as feed__title, f.icon_url as feed__icon_url
           FROM articles a JOIN feeds f ON a.feed_id = f.id
           WHERE a.id = ?""",
        (article_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Article not found")
    d = dict(row)
    d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
    return d


@router.patch("/{article_id}")
async def update_article(article_id: int, body: ArticleUpdate):
    conn = get_connection()
    row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Article not found")
    updates = {}
    for field in ("is_read", "is_saved", "is_starred"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = int(val)
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [article_id]
        conn.execute(f"UPDATE articles SET {set_clause} WHERE id = ?", values)
        conn.commit()
    row = conn.execute(
        """SELECT a.*, f.id as feed__id, f.title as feed__title, f.icon_url as feed__icon_url
           FROM articles a JOIN feeds f ON a.feed_id = f.id
           WHERE a.id = ?""",
        (article_id,),
    ).fetchone()
    conn.close()
    d = dict(row)
    d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
    return d


@router.post("/search")
async def search_articles(body: SearchQuery):
    conn = get_connection()
    conditions = ["articles_fts MATCH ?"]
    params = [body.query]
    if body.feed_id:
        conditions.append("a.feed_id = ?")
        params.append(body.feed_id)
    if body.category_id:
        conditions.append("f.category_id = ?")
        params.append(body.category_id)
    if body.unread is not None:
        conditions.append("a.is_read = ?")
        params.append(int(body.unread))
    if body.saved is not None:
        conditions.append("a.is_saved = ?")
        params.append(int(body.saved))
    where = "WHERE " + " AND ".join(conditions)
    offset = (body.page - 1) * body.per_page

    count_row = conn.execute(
        f"SELECT COUNT(*) as cnt FROM articles_fts JOIN articles a ON articles_fts.rowid = a.id JOIN feeds f ON a.feed_id = f.id {where}",
        params,
    ).fetchone()
    total = count_row["cnt"]
    total_pages = max(1, (total + body.per_page - 1) // body.per_page)

    rows = conn.execute(
        f"""SELECT a.*, f.id as feed__id, f.title as feed__title, f.icon_url as feed__icon_url
            FROM articles_fts
            JOIN articles a ON articles_fts.rowid = a.id
            JOIN feeds f ON a.feed_id = f.id
            {where}
            ORDER BY rank
            LIMIT ? OFFSET ?""",
        params + [body.per_page, offset],
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        d = dict(r)
        d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
        items.append(d)
    return {"items": items, "total": total, "page": body.page, "per_page": body.per_page, "total_pages": total_pages}
```

- [ ] **Step 2: Register in main.py**

```python
from app.routers.articles import router as articles_router
app.include_router(articles_router)
```

---

### Task 8: OPML Import/Export

**Files:**
- Create: `backend/app/routers/opml.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create OPML router**

```python
import xml.etree.ElementTree as ET
from io import StringIO
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import Response
from app.database import get_connection
from app.services.scheduler import refresh_feed

router = APIRouter(prefix="/api/v1/opml", tags=["opml"])


def parse_opml(xml_content: str) -> List[tuple]:
    root = ET.fromstring(xml_content)
    outlines = []
    for elem in root.iter("outline"):
        xml_url = elem.get("xmlUrl")
        if xml_url:
            category = None
            parent = elem
            while parent is not None:
                parent_outline = None
                for p in root.iter("outline"):
                    for child in p:
                        if child is elem:
                            parent_outline = p
                            break
                if parent_outline is not None:
                    category = parent_outline.get("title") or parent_outline.get("text")
                break
            outlines.append((xml_url, category))
    return outlines


@router.post("/import", status_code=200)
async def import_opml(file: UploadFile, background_tasks: BackgroundTasks):
    if not file.filename or not file.filename.endswith((".opml", ".xml")):
        raise HTTPException(400, "File must be an OPML file (.opml or .xml)")
    content = await file.read()
    try:
        outlines = parse_opml(content.decode("utf-8"))
    except ET.ParseError:
        raise HTTPException(400, "Invalid XML in OPML file")
    if not outlines:
        raise HTTPException(400, "No feeds found in OPML file")
    conn = get_connection()
    imported = 0
    for url, category_name in outlines:
        category_id = None
        if category_name:
            existing = conn.execute("SELECT id FROM categories WHERE name = ?", (category_name,)).fetchone()
            if existing:
                category_id = existing["id"]
            else:
                cur = conn.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
                category_id = cur.lastrowid
        try:
            cur = conn.execute(
                "INSERT INTO feeds (url, title, category_id) VALUES (?, ?, ?)",
                (url, url, category_id),
            )
            conn.commit()
            background_tasks.add_task(refresh_feed, cur.lastrowid)
            imported += 1
        except Exception:
            conn.rollback()
    conn.close()
    return {"message": f"Imported {imported} feeds", "total": len(outlines), "imported": imported}


@router.get("/export")
async def export_opml():
    conn = get_connection()
    feeds = conn.execute(
        """SELECT f.*, c.name as category_name
           FROM feeds f LEFT JOIN categories c ON f.category_id = c.id
           ORDER BY c.name, f.title"""
    ).fetchall()
    conn.close()
    root = ET.Element("opml", version="2.0")
    head = ET.SubElement(root, "head")
    ET.SubElement(head, "title").text = "RSS Reader Pro Feeds"
    body = ET.SubElement(root, "body")
    categories = {}
    for feed in feeds:
        cat_name = feed["category_name"] or "__uncategorized__"
        if cat_name not in categories:
            categories[cat_name] = []
        categories[cat_name].append(feed)
    for cat_name, cat_feeds in categories.items():
        if cat_name == "__uncategorized__":
            for feed in cat_feeds:
                outline = ET.SubElement(body, "outline", type="rss", text=feed["title"], title=feed["title"], xmlUrl=feed["url"])
                if feed.get("site_url"):
                    outline.set("htmlUrl", feed["site_url"])
        else:
            cat_el = ET.SubElement(body, "outline", text=cat_name, title=cat_name)
            for feed in cat_feeds:
                outline = ET.SubElement(cat_el, "outline", type="rss", text=feed["title"], title=feed["title"], xmlUrl=feed["url"])
                if feed.get("site_url"):
                    outline.set("htmlUrl", feed["site_url"])
    xml_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return Response(content=xml_bytes, media_type="application/xml", headers={"Content-Disposition": "attachment; filename=feeds.opml"})
```

- [ ] **Step 2: Register in main.py**

```python
from app.routers.opml import router as opml_router
app.include_router(opml_router)
```

---

### Task 9: Stats API

**Files:**
- Create: `backend/app/routers/stats.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create stats router**

```python
from datetime import datetime

from fastapi import APIRouter
from app.database import get_connection

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("")
async def get_stats():
    conn = get_connection()
    total_feeds = conn.execute("SELECT COUNT(*) as c FROM feeds").fetchone()["c"]
    total_categories = conn.execute("SELECT COUNT(*) as c FROM categories").fetchone()["c"]
    unread_count = conn.execute("SELECT COUNT(*) as c FROM articles WHERE is_read = 0").fetchone()["c"]
    saved_count = conn.execute("SELECT COUNT(*) as c FROM articles WHERE is_saved = 1").fetchone()["c"]
    starred_count = conn.execute("SELECT COUNT(*) as c FROM articles WHERE is_starred = 1").fetchone()["c"]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    read_today = conn.execute(
        "SELECT COUNT(*) as c FROM articles WHERE is_read = 1 AND date(created_at) = ?", (today,)
    ).fetchone()["c"]
    conn.close()
    return {
        "total_feeds": total_feeds,
        "total_categories": total_categories,
        "unread_count": unread_count,
        "read_today": read_today,
        "saved_count": saved_count,
        "starred_count": starred_count,
    }
```

- [ ] **Step 2: Register in main.py**

```python
from app.routers.stats import router as stats_router
app.include_router(stats_router)
```

---

### Task 10: Backend Tests

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_categories.py`
- Create: `backend/tests/test_feeds.py`
- Create: `backend/tests/test_articles.py`
- Create: `backend/tests/test_opml.py`

- [ ] **Step 1: Create conftest.py**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, get_connection


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield
    conn = get_connection()
    conn.execute("DELETE FROM articles")
    conn.execute("DELETE FROM feeds")
    conn.execute("DELETE FROM categories")
    conn.commit()
    conn.close()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 2: Create test_categories.py**

```python
import pytest


@pytest.mark.asyncio
async def test_create_category(client):
    resp = await client.post("/api/v1/categories", json={"name": "Technology"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Technology"


@pytest.mark.asyncio
async def test_list_categories(client):
    await client.post("/api/v1/categories", json={"name": "Tech"})
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Tech"


@pytest.mark.asyncio
async def test_delete_category(client):
    resp = await client.post("/api/v1/categories", json={"name": "Tech"})
    cat_id = resp.json()["id"]
    resp = await client.delete(f"/api/v1/categories/{cat_id}")
    assert resp.status_code == 204
    resp = await client.get("/api/v1/categories")
    assert len(resp.json()) == 0
```

- [ ] **Step 3: Create test_feeds.py**

```python
import pytest


@pytest.mark.asyncio
async def test_create_feed(client):
    resp = await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["url"] == "https://example.com/rss"


@pytest.mark.asyncio
async def test_create_duplicate_feed(client):
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_feeds(client):
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await client.get("/api/v1/feeds")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_delete_feed(client):
    resp = await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    feed_id = resp.json()["id"]
    resp = await client.delete(f"/api/v1/feeds/{feed_id}")
    assert resp.status_code == 204
```

- [ ] **Step 4: Create test_articles.py**

```python
import pytest


@pytest.mark.asyncio
async def test_create_and_read_article(client):
    feed_resp = await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    feed_id = feed_resp.json()["id"]

    conn = client._transport.app.dict()  # won't work; use direct approach
    # Instead use the app state
    from app.database import get_connection
    conn = get_connection()
    conn.execute(
        "INSERT INTO articles (feed_id, guid, title, url, published_at) VALUES (?, ?, ?, ?, datetime('now'))",
        (feed_id, "guid-1", "Test Article", "https://example.com/article"),
    )
    conn.commit()
    conn.close()

    resp = await client.get("/api/v1/articles")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Test Article"


@pytest.mark.asyncio
async def test_mark_read(client):
    from app.database import get_connection
    conn = get_connection()
    conn.execute("INSERT INTO feeds (id, url, title) VALUES (1, 'https://x.com/rss', 'X')")
    conn.execute(
        "INSERT INTO articles (feed_id, guid, title) VALUES (1, 'g1', 'Test')",
    )
    conn.commit()
    article_id = conn.execute("SELECT id FROM articles LIMIT 1").fetchone()["id"]
    conn.close()

    resp = await client.patch(f"/api/v1/articles/{article_id}", json={"is_read": True})
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True
```

- [ ] **Step 5: Create test_opml.py**

```python
import pytest


OPML_CONTENT = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head><title>My Feeds</title></head>
<body>
<outline text="Tech" title="Tech">
<outline type="rss" text="HN" title="HN" xmlUrl="https://hnrss.org/frontpage"/>
</outline>
</body>
</opml>"""


@pytest.mark.asyncio
async def test_import_opml(client):
    resp = await client.post(
        "/api/v1/opml/import",
        files={"file": ("feeds.opml", OPML_CONTENT, "application/xml")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 1


@pytest.mark.asyncio
async def test_export_opml(client):
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await client.get("/api/v1/opml/export")
    assert resp.status_code == 200
    assert b"<opml" in resp.content
```

- [ ] **Step 6: Run tests**

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

Expected: All tests pass.

---

### Task 11: Dockerize Backend

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create backend Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Build and test**

```bash
docker build -t rss-reader-backend ./backend
docker run -d -p 8000:8000 -v ${PWD}/data:/app/data rss-reader-backend
curl http://localhost:8000/api/v1/health
docker stop $(docker ps -q --filter ancestor=rss-reader-backend)
```

---

### Task 12: Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/index.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "rss-reader-pro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "@tailwindcss/typography": "^0.5.15",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "msw": "^2.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

- [ ] **Step 4: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
```

- [ ] **Step 5: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RSS Reader Pro</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 7: Create src/styles/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100;
}
```

- [ ] **Step 8: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 9: Create src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <div className="flex h-screen">
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/feeds" element={<div>Feed Manager</div>} />
        <Route path="/articles" element={<div>All Articles</div>} />
        <Route path="/saved" element={<div>Saved</div>} />
        <Route path="/search" element={<div>Search</div>} />
        <Route path="/settings" element={<div>Settings</div>} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 10: Verify frontend builds**

```bash
cd frontend
npm install
npm run dev
```

Expected: Vite dev server starts, shows placeholder pages.

---

### Task 13: API Client + Zustand Stores

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/stores/uiStore.ts`
- Create: `frontend/src/stores/feedStore.ts`
- Create: `frontend/src/stores/articleStore.ts`
- Create: `frontend/src/stores/categoryStore.ts`

- [ ] **Step 1: Create API client**

```ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

export interface Feed {
  id: number
  title: string
  url: string
  site_url: string | null
  description: string | null
  icon_url: string | null
  category_id: number | null
  enabled: boolean
  refresh_interval: number
  error_count: number
  last_fetched_at: string | null
  created_at: string
}

export interface Category {
  id: number
  name: string
  feed_count: number
  created_at: string
}

export interface Article {
  id: number
  feed_id: number
  guid: string
  title: string
  url: string | null
  author: string | null
  summary: string | null
  content: string | null
  image_url: string | null
  published_at: string | null
  is_read: boolean
  is_saved: boolean
  is_starred: boolean
  created_at: string
  feed: { id: number; title: string; icon_url: string | null } | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface Stats {
  total_feeds: number
  total_categories: number
  unread_count: number
  read_today: number
  saved_count: number
  starred_count: number
}

export const feedsApi = {
  list: (categoryId?: number) => api.get<Feed[]>('/feeds', { params: { category_id: categoryId } }).then(r => r.data),
  get: (id: number) => api.get<Feed>(`/feeds/${id}`).then(r => r.data),
  create: (data: { url: string; category_id?: number }) => api.post<Feed>('/feeds', data).then(r => r.data),
  update: (id: number, data: Partial<Feed>) => api.put<Feed>(`/feeds/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/feeds/${id}`),
  refresh: (id: number) => api.post(`/feeds/${id}/refresh`),
  refreshAll: () => api.post('/feeds/refresh-all'),
}

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then(r => r.data),
  create: (name: string) => api.post<Category>('/categories', { name }).then(r => r.data),
  update: (id: number, name: string) => api.put<Category>(`/categories/${id}`, { name }).then(r => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

export const articlesApi = {
  list: (params?: { feed_id?: number; category_id?: number; unread?: boolean; saved?: boolean; starred?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Article>>('/articles', { params }).then(r => r.data),
  get: (id: number) => api.get<Article>(`/articles/${id}`).then(r => r.data),
  update: (id: number, data: { is_read?: boolean; is_saved?: boolean; is_starred?: boolean }) =>
    api.patch<Article>(`/articles/${id}`, data).then(r => r.data),
  search: (params: { query: string; page?: number; per_page?: number; feed_id?: number; unread?: boolean; saved?: boolean }) =>
    api.post<PaginatedResponse<Article>>('/articles/search', params).then(r => r.data),
}

export const opmlApi = {
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/opml/import', form).then(r => r.data)
  },
  export: () => api.get('/opml/export', { responseType: 'blob' }).then(r => r.data),
}

export const statsApi = {
  get: () => api.get<Stats>('/stats').then(r => r.data),
}
```

- [ ] **Step 2: Create uiStore**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  readingWidth: 'normal' | 'wide' | 'full'
  fontSize: 'sm' | 'base' | 'lg'
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setReadingWidth: (w: 'normal' | 'wide' | 'full') => void
  setFontSize: (s: 'sm' | 'base' | 'lg') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      readingWidth: 'normal',
      fontSize: 'base',
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setReadingWidth: (readingWidth) => set({ readingWidth }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: 'rss-ui-prefs' },
  ),
)
```

- [ ] **Step 3: Create feedStore**

```ts
import { create } from 'zustand'
import { Feed } from '../api/client'

interface FeedState {
  feeds: Feed[]
  selectedFeedId: number | null
  setFeeds: (feeds: Feed[]) => void
  setSelectedFeedId: (id: number | null) => void
}

export const useFeedStore = create<FeedState>((set) => ({
  feeds: [],
  selectedFeedId: null,
  setFeeds: (feeds) => set({ feeds }),
  setSelectedFeedId: (selectedFeedId) => set({ selectedFeedId }),
}))
```

- [ ] **Step 4: Create articleStore**

```ts
import { create } from 'zustand'
import { Article } from '../api/client'

interface ArticleState {
  articles: Article[]
  selectedArticleId: number | null
  total: number
  page: number
  setArticles: (articles: Article[], total: number) => void
  setSelectedArticleId: (id: number | null) => void
  setPage: (page: number) => void
}

export const useArticleStore = create<ArticleState>((set) => ({
  articles: [],
  selectedArticleId: null,
  total: 0,
  page: 1,
  setArticles: (articles, total) => set({ articles, total }),
  setSelectedArticleId: (selectedArticleId) => set({ selectedArticleId }),
  setPage: (page) => set({ page }),
}))
```

- [ ] **Step 5: Create categoryStore**

```ts
import { create } from 'zustand'
import { Category } from '../api/client'

interface CategoryState {
  categories: Category[]
  selectedCategoryId: number | null
  setCategories: (categories: Category[]) => void
  setSelectedCategoryId: (id: number | null) => void
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategoryId: null,
  setCategories: (categories) => set({ categories }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
}))
```

---

### Task 14: Layout Components — Sidebar, Article List, Reading Pane

**Files:**
- Create: `frontend/src/components/Layout/Sidebar.tsx`
- Create: `frontend/src/components/Layout/ArticleList.tsx`
- Create: `frontend/src/components/Layout/ReadingPane.tsx`
- Create: `frontend/src/components/Layout/MainLayout.tsx`
- Create: `frontend/src/components/EmptyState.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create MainLayout**

```tsx
import { useUIStore } from '../../stores/uiStore'
import Sidebar from './Sidebar'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
          <Sidebar />
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create Sidebar**

```tsx
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { feedsApi, categoriesApi, statsApi } from '../../api/client'
import { useFeedStore } from '../../stores/feedStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useUIStore } from '../../stores/uiStore'

export default function Sidebar() {
  const location = useLocation()
  const { feeds, setFeeds } = useFeedStore()
  const { categories, setCategories } = useCategoryStore()
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    feedsApi.list().then(setFeeds).catch(() => {})
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/articles', label: 'All Articles', icon: '📰' },
    { path: '/saved', label: 'Saved', icon: '⭐' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/feeds', label: 'Manage Feeds', icon: '⚙️' },
    { path: '/settings', label: 'Settings', icon: '🔧' },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold text-blue-600">RSS Reader</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              location.pathname === link.path
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}

        <div className="border-t border-gray-200 dark:border-gray-800 my-2 pt-2">
          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
          <Link
            to="/articles"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <span>📋</span>
            <span>All Feeds</span>
            <span className="ml-auto text-xs text-gray-400">
              {feeds.filter(f => f.enabled).length}
            </span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span>📁</span>
              <span>{cat.name}</span>
              <span className="ml-auto text-xs text-gray-400">{cat.feed_count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create EmptyState**

```tsx
interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ArticleList**

```tsx
import { useNavigate } from 'react-router-dom'
import { Article } from '../../api/client'

interface ArticleListProps {
  articles: Article[]
  selectedId: number | null
  onSelect: (article: Article) => void
}

export default function ArticleList({ articles, selectedId, onSelect }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No articles
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
      {articles.map((article) => (
        <div
          key={article.id}
          onClick={() => onSelect(article)}
          className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
            selectedId === article.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          } ${!article.is_read ? 'border-l-2 border-l-blue-500' : ''}`}
        >
          <div className="flex gap-3">
            {article.image_url && (
              <img src={article.image_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm ${!article.is_read ? 'font-semibold' : 'font-normal'} text-gray-900 dark:text-gray-100 truncate`}>
                {article.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{article.feed?.title}</span>
                {article.author && <span>· {article.author}</span>}
                {article.published_at && (
                  <span>· {new Date(article.published_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {article.is_saved && <span className="text-yellow-500 text-xs">⭐</span>}
              {article.is_starred && <span className="text-red-500 text-xs">❤️</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create ReadingPane**

```tsx
import { Article } from '../../api/client'
import { articlesApi } from '../../api/client'
import EmptyState from '../EmptyState'

interface ReadingPaneProps {
  article: Article | null
  onUpdate?: (article: Article) => void
}

export default function ReadingPane({ article, onUpdate }: ReadingPaneProps) {
  if (!article) {
    return <EmptyState icon="📖" title="Select an article" description="Choose an article from the list to start reading" />
  }

  const handleToggle = async (field: 'is_read' | 'is_saved' | 'is_starred') => {
    try {
      const updated = await articlesApi.update(article.id, { [field]: !article[field] })
      onUpdate?.(updated)
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        {article.image_url && (
          <img src={article.image_url} alt="" className="w-full h-64 object-cover rounded-lg mb-6" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
          <span>{article.feed?.title}</span>
          {article.author && <span>· {article.author}</span>}
          {article.published_at && <span>· {new Date(article.published_at).toLocaleDateString()}</span>}
        </div>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleToggle('is_read')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_read ? 'bg-gray-100 dark:bg-gray-800 text-gray-600' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            }`}
          >
            {article.is_read ? 'Mark Unread' : 'Mark Read'}
          </button>
          <button
            onClick={() => handleToggle('is_saved')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_saved ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            {article.is_saved ? 'Unsave' : 'Save'}
          </button>
          <button
            onClick={() => handleToggle('is_starred')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              article.is_starred ? 'bg-red-100 dark:bg-red-900 text-red-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            {article.is_starred ? 'Unstar' : 'Star'}
          </button>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
            >
              Open Original
            </a>
          )}
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || article.summary || '' }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Update App.tsx with layout and routes**

```tsx
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import { useUIStore } from './stores/uiStore'

export default function App() {
  const { theme } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/feeds" element={<div>Feed Manager</div>} />
        <Route path="/articles" element={<div>All Articles</div>} />
        <Route path="/category/:id" element={<div>Category View</div>} />
        <Route path="/saved" element={<div>Saved</div>} />
        <Route path="/search" element={<div>Search</div>} />
        <Route path="/settings" element={<div>Settings</div>} />
      </Route>
    </Routes>
  )
}
```

---

### Task 15: Dashboard Page

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/components/Dashboard/StatsCards.tsx`
- Create: `frontend/src/components/Dashboard/QuickActions.tsx`

- [ ] **Step 1: Create StatsCards**

```tsx
import { Stats } from '../../api/client'

interface StatsCardsProps {
  stats: Stats | null
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null
  const cards = [
    { label: 'Total Feeds', value: stats.total_feeds, color: 'text-blue-600' },
    { label: 'Unread', value: stats.unread_count, color: 'text-orange-600' },
    { label: 'Read Today', value: stats.read_today, color: 'text-green-600' },
    { label: 'Saved', value: stats.saved_count, color: 'text-purple-600' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create QuickActions**

```tsx
import { useNavigate } from 'react-router-dom'
import { opmlApi, feedsApi } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'

export default function QuickActions() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.opml,.xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          await opmlApi.import(file)
          queryClient.invalidateQueries()
          alert('Feeds imported successfully!')
        } catch {
          alert('Failed to import feeds')
        }
      }
    }
    input.click()
  }

  const handleExport = async () => {
    try {
      const blob = await opmlApi.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'feeds.opml'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export feeds')
    }
  }

  const handleRefreshAll = async () => {
    try {
      await feedsApi.refreshAll()
      alert('Refresh started')
    } catch {
      alert('Failed to refresh')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/feeds')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
          + Add Feed
        </button>
        <button onClick={handleRefreshAll} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Refresh All
        </button>
        <button onClick={handleImport} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Import OPML
        </button>
        <button onClick={handleExport} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200">
          Export OPML
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Dashboard page**

```tsx
import { useEffect, useState } from 'react'
import { statsApi, feedsApi, Stats, Feed } from '../api/client'
import StatsCards from '../components/Dashboard/StatsCards'
import QuickActions from '../components/Dashboard/QuickActions'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([])

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {})
    feedsApi.list().then(setRecentFeeds).catch(() => {})
  }, [])

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
      <StatsCards stats={stats} />
      <QuickActions />

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Recent Feeds</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          {recentFeeds.slice(0, 10).map((feed) => (
            <div key={feed.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              {feed.icon_url ? (
                <img src={feed.icon_url} alt="" className="w-6 h-6 rounded" />
              ) : (
                <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs text-blue-600">
                  R
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                <p className="text-xs text-gray-500 truncate">{feed.url}</p>
              </div>
              <span className={`text-xs ${feed.enabled ? 'text-green-500' : 'text-red-500'}`}>
                {feed.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
          {recentFeeds.length === 0 && (
            <p className="text-sm text-gray-400 p-4 text-center">No feeds yet. Add your first feed!</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire up Dashboard in App.tsx**

```tsx
import Dashboard from './pages/Dashboard'
// Replace the "/" route:
<Route path="/" element={<Dashboard />} />
```

---

### Task 16: All Articles Page (Combined View)

**Files:**
- Create: `frontend/src/pages/AllArticles.tsx`

- [ ] **Step 1: Create AllArticles page (3-pane layout)**

```tsx
import { useEffect, useState, useCallback } from 'react'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'

export default function AllArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>('unread')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, per_page: 50 }
      if (filter === 'unread') params.unread = false
      if (filter === 'saved') params.saved = true
      const data = await articlesApi.list(params)
      setArticles(data.items)
      setTotal(data.total)
    } catch {}
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1">
            {(['all', 'unread', 'saved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  filter === f
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
        {total > 50 && (
          <div className="flex justify-center gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Prev</button>
            <span className="text-xs text-gray-500 self-center">{page} / {Math.ceil(total / 50)}</span>
            <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
```

---

### Task 17: Feed Manager Page

**Files:**
- Create: `frontend/src/pages/FeedManager.tsx`

- [ ] **Step 1: Create FeedManager page**

```tsx
import { useEffect, useState } from 'react'
import { feedsApi, categoriesApi, Feed, Category } from '../api/client'
import { useQueryClient } from '@tanstack/react-query'

export default function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [catId, setCatId] = useState<number | undefined>()
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    feedsApi.list().then(setFeeds).catch(() => {})
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const handleAdd = async () => {
    if (!url) return
    try {
      await feedsApi.create({ url, category_id: catId })
      setUrl('')
      setCatId(undefined)
      setShowAdd(false)
      feedsApi.list().then(setFeeds)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to add feed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this feed?')) return
    await feedsApi.delete(id)
    feedsApi.list().then(setFeeds)
  }

  const handleToggle = async (feed: Feed) => {
    await feedsApi.update(feed.id, { enabled: !feed.enabled })
    feedsApi.list().then(setFeeds)
  }

  const handleAddCategory = async () => {
    if (!newCatName) return
    await categoriesApi.create(newCatName)
    setNewCatName('')
    categoriesApi.list().then(setCategories)
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Feeds will become uncategorized.')) return
    await categoriesApi.delete(id)
    categoriesApi.list().then(setCategories)
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Feeds</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showAdd ? 'Cancel' : '+ Add Feed'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              placeholder="RSS Feed URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <select
              value={catId ?? ''}
              onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Feeds ({feeds.length})</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                {feed.icon_url ? (
                  <img src={feed.icon_url} alt="" className="w-8 h-8 rounded" />
                ) : (
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm text-blue-600 font-bold">
                    {feed.title[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{feed.title}</p>
                  <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                  {feed.error_count > 0 && (
                    <p className="text-xs text-red-500">Errors: {feed.error_count}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(feed)} className={`px-2 py-1 rounded text-xs font-medium ${feed.enabled ? 'bg-green-100 dark:bg-green-900 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {feed.enabled ? 'On' : 'Off'}
                  </button>
                  <button onClick={() => feedsApi.refresh(feed.id)} className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200" title="Refresh">
                    ↻
                  </button>
                  <button onClick={() => handleDelete(feed.id)} className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900 text-red-600 hover:bg-red-200" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {feeds.length === 0 && (
              <p className="text-sm text-gray-400 p-4 text-center">No feeds yet. Add one above!</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Categories</h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New category"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs"
              />
              <button onClick={handleAddCategory} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Add</button>
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name} ({cat.feed_count})</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-gray-400 text-center">No categories</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 18: Remaining Pages (Category, Saved, Search, Settings)

**Files:**
- Create: `frontend/src/pages/CategoryView.tsx`
- Create: `frontend/src/pages/SavedView.tsx`
- Create: `frontend/src/pages/SearchPage.tsx`
- Create: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create CategoryView**

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { articlesApi, feedsApi, Article, Feed } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'

export default function CategoryView() {
  const { id } = useParams<{ id: string }>()
  const [feedIds, setFeedIds] = useState<number[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    if (!id) return
    feedsApi.list(Number(id)).then((feeds) => {
      setFeedIds(feeds.map((f: Feed) => f.id))
      if (feeds.length > 0) setCategoryName(feeds[0].title)
    })
    fetchCategoryName(Number(id))
  }, [id])

  const fetchCategoryName = async (catId: number) => {
    try {
      const cats = await (await import('../api/client')).categoriesApi.list()
      const cat = cats.find((c: any) => c.id === catId)
      if (cat) setCategoryName(cat.name)
    } catch {}
  }

  useEffect(() => {
    if (feedIds.length === 0) return
    articlesApi.list({ feed_id: feedIds[0], unread: false }).then((data) => {
      setArticles(data.items)
    }).catch(() => {})
  }, [feedIds])

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{categoryName}</h2>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
```

- [ ] **Step 2: Create SavedView**

```tsx
import { useEffect, useState } from 'react'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'
import EmptyState from '../components/EmptyState'

export default function SavedView() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)

  useEffect(() => {
    articlesApi.list({ saved: true }).then((data) => setArticles(data.items)).catch(() => {})
  }, [])

  if (articles.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="No saved articles"
        description="Save articles while reading to find them here later"
      />
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved Articles</h2>
        </div>
        <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
```

- [ ] **Step 3: Create SearchPage**

```tsx
import { useState } from 'react'
import { articlesApi, Article } from '../api/client'
import ArticleList from '../components/Layout/ArticleList'
import ReadingPane from '../components/Layout/ReadingPane'
import EmptyState from '../components/EmptyState'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearched(true)
    try {
      const data = await articlesApi.search({ query: query.trim() })
      setArticles(data.items)
    } catch {}
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Search</button>
          </div>
        </div>
        {searched && articles.length === 0 ? (
          <EmptyState icon="🔍" title="No results" description={`No articles found for "${query}"`} />
        ) : (
          <ArticleList articles={articles} selectedId={selected?.id ?? null} onSelect={setSelected} />
        )}
      </div>
      <ReadingPane article={selected} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} />
    </div>
  )
}
```

- [ ] **Step 4: Create SettingsPage**

```tsx
import { useUIStore } from '../stores/uiStore'

export default function SettingsPage() {
  const { theme, setTheme, readingWidth, setReadingWidth, fontSize, setFontSize } = useUIStore()

  const handleClearData = async () => {
    if (!confirm('Clear all data? This cannot be undone.')) return
    try {
      await (await import('../api/client')).feedsApi.list()
      // Backend doesn't have a clear endpoint in MVP — placeholder
      alert('Clear data feature coming soon')
    } catch {}
  }

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider">Appearance</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Reading Width</span>
            <select
              value={readingWidth}
              onChange={(e) => setReadingWidth(e.target.value as 'normal' | 'wide' | 'full')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="wide">Wide</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Font Size</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="sm">Small</option>
              <option value="base">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider">Data</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <button onClick={() => window.open('/api/v1/opml/export')} className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200">
            Export OPML
          </button>
          <button onClick={handleClearData} className="w-full text-left px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 hover:bg-red-100">
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Wire all pages in App.tsx**

Final App.tsx routes:
```tsx
import Dashboard from './pages/Dashboard'
import FeedManager from './pages/FeedManager'
import AllArticles from './pages/AllArticles'
import CategoryView from './pages/CategoryView'
import SavedView from './pages/SavedView'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'

// Inside <Routes> <Route element={<MainLayout />}>:
<Route index element={<Dashboard />} />
<Route path="feeds" element={<FeedManager />} />
<Route path="articles" element={<AllArticles />} />
<Route path="category/:id" element={<CategoryView />} />
<Route path="saved" element={<SavedView />} />
<Route path="search" element={<SearchPage />} />
<Route path="settings" element={<SettingsPage />} />
```

---

### Task 19: Dockerize Frontend + Docker Compose

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create frontend Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/rss.db
      - LOG_LEVEL=INFO
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 4: Build and verify**

```bash
docker compose build
docker compose up -d
```

Expected: `http://localhost` serves the app, API calls work via `/api/...`.

---

### Task 20: Frontend Tests

**Files:**
- Create: `frontend/src/test-setup.ts`
- Create: `frontend/src/components/__tests__/EmptyState.test.tsx`
- Create: `frontend/src/stores/__tests__/uiStore.test.ts`

- [ ] **Step 1: Create test setup**

```ts
// src/test-setup.ts
import '@testing-library/jest-dom'
```

Update `frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  }
})
```

- [ ] **Step 2: Write EmptyState test**

```tsx
import { render, screen } from '@testing-library/react'
import EmptyState from '../EmptyState'
import { describe, it, expect, vi } from 'vitest'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing to see here" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Empty" description="desc" action={{ label: 'Add', onClick }} />)
    const btn = screen.getByText('Add')
    btn.click()
    expect(onClick).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Write uiStore test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'light', sidebarOpen: true })
  })

  it('toggles theme', () => {
    useUIStore.getState().setTheme('dark')
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('toggles sidebar', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npm test
```

Expected: Tests pass.

---

## Self-Review Checklist

After the plan is saved, verify:

- [ ] Every spec requirement maps to at least one task
- [ ] No "TBD", "TODO", or placeholder code
- [ ] Type signatures are consistent across tasks
- [ ] All file paths are exact and absolute to project root
- [ ] Every code step shows actual code, not instructions
- [ ] Testing is included for both backend and frontend
