import pytest


@pytest.mark.asyncio
async def test_list_articles_empty(client):
    resp = await client.get("/api/v1/articles")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_articles_with_data(client):
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    from app.database import get_connection
    conn = get_connection()
    feed_id = conn.execute("SELECT id FROM feeds LIMIT 1").fetchone()["id"]
    conn.execute(
        "INSERT INTO articles (feed_id, guid, title, url, published_at) VALUES (?, 'guid-1', 'Test Article', 'https://example.com/a', datetime('now'))",
        (feed_id,),
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
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    from app.database import get_connection
    conn = get_connection()
    feed_id = conn.execute("SELECT id FROM feeds LIMIT 1").fetchone()["id"]
    conn.execute(
        "INSERT INTO articles (feed_id, guid, title) VALUES (?, 'g1', 'Test')",
        (feed_id,),
    )
    conn.commit()
    article_id = conn.execute("SELECT id FROM articles LIMIT 1").fetchone()["id"]
    conn.close()
    resp = await client.patch(f"/api/v1/articles/{article_id}", json={"is_read": True})
    assert resp.status_code == 200
    assert resp.json()["is_read"] == True


@pytest.mark.asyncio
async def test_get_article_not_found(client):
    resp = await client.get("/api/v1/articles/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_search_articles(client):
    await client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    from app.database import get_connection
    conn = get_connection()
    feed_id = conn.execute("SELECT id FROM feeds LIMIT 1").fetchone()["id"]
    conn.execute(
        "INSERT INTO articles (feed_id, guid, title, content) VALUES (?, 'g2', 'Python Programming', 'Python is a great language')",
        (feed_id,),
    )
    conn.commit()
    conn.close()
    resp = await client.post("/api/v1/articles/search", json={"query": "Python"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
