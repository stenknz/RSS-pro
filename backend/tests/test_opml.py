import pytest

OPML_CONTENT = """<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head><title>My Feeds</title></head>
<body>
<outline text="Tech" title="Tech">
<outline type="rss" text="HN" title="HN" xmlUrl="https://hnrss.org/frontpage"/>
</outline>
</body>
</opml>"""


@pytest.mark.asyncio
async def test_import_opml(auth_client):
    resp = await auth_client.post(
        "/api/v1/opml/import",
        files={"file": ("feeds.opml", OPML_CONTENT, "application/xml")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 1


@pytest.mark.asyncio
async def test_export_opml(auth_client):
    await auth_client.post("/api/v1/feeds", json={"url": "https://example.com/rss"})
    resp = await auth_client.get("/api/v1/opml/export")
    assert resp.status_code == 200
    assert b"<opml" in resp.content
