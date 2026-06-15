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
        (parsed.title, parsed.site_url, parsed.description, parsed.icon_url, datetime.now(datetime.UTC).isoformat(), feed_id),
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
