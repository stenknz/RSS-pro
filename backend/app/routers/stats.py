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
