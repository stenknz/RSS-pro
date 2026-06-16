from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_connection
from app.models import ArticleUpdate, SearchQuery
from app.auth import get_current_user
from app.services.fulltext import enrich_article

router = APIRouter(prefix="/api/v1/articles", tags=["articles"], dependencies=[Depends(get_current_user)])


def _row_to_article(row: dict) -> dict:
    """Convert an SQLite row to a proper article dict with booleans."""
    d = dict(row)
    for field in ("is_read", "is_saved", "is_starred"):
        if field in d:
            d[field] = bool(d[field])
    return d


@router.get("")
async def list_articles(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    feed_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    unread: Optional[bool] = Query(None),
    saved: Optional[bool] = Query(None),
    starred: Optional[bool] = Query(None),
    read_today: Optional[bool] = Query(None),
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
        params.append(0 if unread else 1)
    if saved is not None:
        conditions.append("a.is_saved = ?")
        params.append(int(saved))
    if starred is not None:
        conditions.append("a.is_starred = ?")
        params.append(int(starred))
    if read_today is not None:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        conditions.append("a.is_read = 1 AND date(a.read_at) = ?")
        params.append(today)
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
        a = _row_to_article(d)
        a["feed"] = {"id": a.pop("feed__id"), "title": a.pop("feed__title"), "icon_url": a.pop("feed__icon_url")}
        items.append(a)
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
    d = _row_to_article(row)
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
    if body.is_read is True:
        updates["read_at"] = datetime.utcnow().isoformat()
    if body.is_starred is False:
        updates["content"] = None
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
    d = _row_to_article(row)
    d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
    return d


@router.post("/{article_id}/enrich")
async def enrich_article_content(article_id: int, user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Article not found")
    if not row["url"]:
        conn.close()
        raise HTTPException(400, "Article has no URL to enrich from")

    content = await enrich_article(row["url"])
    if not content:
        conn.close()
        raise HTTPException(502, "Failed to fetch full text")

    conn.execute("UPDATE articles SET content = ? WHERE id = ?", (content, article_id))
    conn.commit()

    updated = conn.execute(
        """SELECT a.*, f.id as feed__id, f.title as feed__title, f.icon_url as feed__icon_url
           FROM articles a JOIN feeds f ON a.feed_id = f.id
           WHERE a.id = ?""",
        (article_id,),
    ).fetchone()
    conn.close()
    d = _row_to_article(updated)
    d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
    return d


@router.post("/cleanup-content")
async def cleanup_content(user=Depends(get_current_user)):
    conn = get_connection()
    result = conn.execute(
        "UPDATE articles SET content = NULL WHERE content IS NOT NULL AND is_starred = 0"
    )
    conn.commit()
    affected = result.rowcount
    conn.close()

    conn = get_connection()
    result = conn.execute("SELECT COUNT(*) as c FROM articles WHERE content IS NOT NULL")
    remaining = result.fetchone()["c"]
    conn.close()

    return {"cleared": affected, "remaining_with_content": remaining}


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
        params.append(0 if body.unread else 1)
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
        a = _row_to_article(r)
        a["feed"] = {"id": a.pop("feed__id"), "title": a.pop("feed__title"), "icon_url": a.pop("feed__icon_url")}
        items.append(a)
    return {"items": items, "total": total, "page": body.page, "per_page": body.per_page, "total_pages": total_pages}
