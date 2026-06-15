from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.database import get_connection
from app.models import ArticleUpdate, SearchQuery

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
        params.append(0 if unread else 1)
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
        d = dict(r)
        d["feed"] = {"id": d.pop("feed__id"), "title": d.pop("feed__title"), "icon_url": d.pop("feed__icon_url")}
        items.append(d)
    return {"items": items, "total": total, "page": body.page, "per_page": body.per_page, "total_pages": total_pages}
