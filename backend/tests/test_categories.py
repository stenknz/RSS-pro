import pytest


@pytest.mark.asyncio
async def test_create_category(auth_client):
    resp = await auth_client.post("/api/v1/categories", json={"name": "Technology"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Technology"


@pytest.mark.asyncio
async def test_list_categories(auth_client):
    await auth_client.post("/api/v1/categories", json={"name": "Tech"})
    resp = await auth_client.get("/api/v1/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Tech"


@pytest.mark.asyncio
async def test_delete_category(auth_client):
    resp = await auth_client.post("/api/v1/categories", json={"name": "Tech"})
    cat_id = resp.json()["id"]
    resp = await auth_client.delete(f"/api/v1/categories/{cat_id}")
    assert resp.status_code == 204
    resp = await auth_client.get("/api/v1/categories")
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_duplicate_category(auth_client):
    await auth_client.post("/api/v1/categories", json={"name": "Tech"})
    resp = await auth_client.post("/api/v1/categories", json={"name": "Tech"})
    assert resp.status_code == 409
