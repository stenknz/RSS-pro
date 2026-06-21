import asyncio
from datetime import datetime, timezone

from app.database import get_connection
from app.services.fetcher import fetch_feed
from app.services.parser import parse_feed

_tasks: dict[int, asyncio.Task] = {}


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
        (parsed["title"], parsed["site_url"], parsed["description"], parsed["icon_url"], datetime.now(timezone.utc).isoformat(), feed_id),
    )
    for article in parsed["articles"]:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO articles (feed_id, guid, title, url, author, summary, content, image_url, published_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (feed_id, article["guid"], article["title"], article["url"], article["author"],
                 article["summary"], article["content"], article["image_url"], article["published_at"]),
            )
        except Exception:
            pass
    conn.commit()
    conn.close()


async def _run_interval(feed_id: int, interval_minutes: int):
    while True:
        await asyncio.sleep(interval_minutes * 60)
        await refresh_feed(feed_id)


def schedule_feed(feed_id: int, interval_minutes: int):
    if feed_id in _tasks:
        _tasks[feed_id].cancel()
    _tasks[feed_id] = asyncio.create_task(_run_interval(feed_id, interval_minutes))


def remove_feed_schedule(feed_id: int):
    if feed_id in _tasks:
        _tasks[feed_id].cancel()
        del _tasks[feed_id]


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


def shutdown_scheduler():
    for task in _tasks.values():
        task.cancel()
    _tasks.clear()
