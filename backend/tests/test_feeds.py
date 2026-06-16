import pytest


@pytest.mark.asyncio
async def test_create_feed(auth_client):
    resp = await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["url"] == "https://example.com/rss"


@pytest.mark.asyncio
async def test_create_duplicate_feed(auth_client):
    await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_feeds(auth_client):
    await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await auth_client.get("/api/v1/feeds")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_update_feed(auth_client):
    resp = await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    feed_id = resp.json()["id"]
    resp = await auth_client.put(f"/api/v1/feeds/{feed_id}", json={"title": "My Feed"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "My Feed"


@pytest.mark.asyncio
async def test_delete_feed(auth_client):
    resp = await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    feed_id = resp.json()["id"]
    resp = await auth_client.delete(f"/api/v1/feeds/{feed_id}")
    assert resp.status_code == 204
