from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from app.database import get_connection
from app.models import FeedCreate, FeedUpdate, FeedOut
from app.services.scheduler import refresh_feed, schedule_feed

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
