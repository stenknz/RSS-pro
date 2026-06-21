import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from app.database import get_connection
from app.models import FeedOut
from app.auth import get_current_user
from app.services.scheduler import refresh_feed, schedule_feed

router = APIRouter(prefix="/api/v1/feeds", tags=["feeds"], dependencies=[Depends(get_current_user)])


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
async def create_feed(url: str = Body(...), category_id: Optional[int] = Body(None)):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO feeds (url, title, category_id) VALUES (?, ?, ?)",
            (url, url, category_id),
        )
        conn.commit()
        feed_id = cur.lastrowid
        schedule_feed(feed_id, 30)
        asyncio.ensure_future(refresh_feed(feed_id))
        row = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
        conn.close()
        return dict(row)
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Feed URL already exists")
        raise HTTPException(400, "Failed to create feed")


@router.get("/{feed_id}", response_model=FeedOut)
async def get_feed(feed_id: int):
    conn = get_connection()
    row = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Feed not found")
    return dict(row)


@router.put("/{feed_id}", response_model=FeedOut)
async def update_feed(feed_id: int, body: dict):
    conn = get_connection()
    feed = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    if not feed:
        conn.close()
        raise HTTPException(404, "Feed not found")
    updates = {}
    for field in ("title", "url", "category_id", "refresh_interval", "enabled"):
        val = body.get(field)
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
async def refresh_single_feed(feed_id: int):
    conn = get_connection()
    feed = conn.execute("SELECT * FROM feeds WHERE id = ?", (feed_id,)).fetchone()
    conn.close()
    if not feed:
        raise HTTPException(404, "Feed not found")
    asyncio.ensure_future(refresh_feed(feed_id))
    return {"message": "Refresh started"}


@router.post("/refresh-all")
async def refresh_all():
    from app.services.scheduler import refresh_all_feeds
    asyncio.ensure_future(refresh_all_feeds())
    return {"message": "Refresh of all feeds started"}
