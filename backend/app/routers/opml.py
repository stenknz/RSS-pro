import xml.etree.ElementTree as ET
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import Response
from app.database import get_connection
from app.services.scheduler import refresh_feed

router = APIRouter(prefix="/api/v1/opml", tags=["opml"])


def parse_opml(xml_content: str) -> List[tuple]:
    root = ET.fromstring(xml_content)
    outlines = []
    for elem in root.iter("outline"):
        xml_url = elem.get("xmlUrl")
        if xml_url:
            category: Optional[str] = None
            parent = None
            for potential_parent in root.iter("outline"):
                for child in potential_parent:
                    if child is elem:
                        parent = potential_parent
                        break
                if parent is not None:
                    break
            if parent is not None:
                category = parent.get("title") or parent.get("text")
            outlines.append((xml_url, category))
    return outlines


@router.post("/import", status_code=200)
async def import_opml(file: UploadFile, background_tasks: BackgroundTasks):
    if not file.filename or not file.filename.endswith((".opml", ".xml")):
        raise HTTPException(400, "File must be an OPML file (.opml or .xml)")
    content = await file.read()
    try:
        outlines = parse_opml(content.decode("utf-8"))
    except ET.ParseError:
        raise HTTPException(400, "Invalid XML in OPML file")
    if not outlines:
        raise HTTPException(400, "No feeds found in OPML file")
    conn = get_connection()
    imported = 0
    for url, category_name in outlines:
        category_id = None
        if category_name:
            existing = conn.execute("SELECT id FROM categories WHERE name = ?", (category_name,)).fetchone()
            if existing:
                category_id = existing["id"]
            else:
                cur = conn.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
                category_id = cur.lastrowid
        try:
            cur = conn.execute(
                "INSERT INTO feeds (url, title, category_id) VALUES (?, ?, ?)",
                (url, url, category_id),
            )
            conn.commit()
            background_tasks.add_task(refresh_feed, cur.lastrowid)
            imported += 1
        except Exception:
            conn.rollback()
    conn.close()
    return {"message": f"Imported {imported} feeds", "total": len(outlines), "imported": imported}


@router.get("/export")
async def export_opml():
    conn = get_connection()
    feeds = conn.execute(
        """SELECT f.*, c.name as category_name
           FROM feeds f LEFT JOIN categories c ON f.category_id = c.id
           ORDER BY c.name, f.title"""
    ).fetchall()
    conn.close()
    root = ET.Element("opml", version="2.0")
    head = ET.SubElement(root, "head")
    ET.SubElement(head, "title").text = "RSS Reader Pro Feeds"
    body = ET.SubElement(root, "body")
    categories: dict = {}
    for feed in feeds:
        cat_name = feed["category_name"] or "__uncategorized__"
        if cat_name not in categories:
            categories[cat_name] = []
        categories[cat_name].append(feed)
    for cat_name, cat_feeds in categories.items():
        if cat_name == "__uncategorized__":
            for feed in cat_feeds:
                outline = ET.SubElement(body, "outline", type="rss", text=feed["title"], title=feed["title"], xmlUrl=feed["url"])
                if feed["site_url"]:
                    outline.set("htmlUrl", feed["site_url"])
        else:
            cat_el = ET.SubElement(body, "outline", text=cat_name, title=cat_name)
            for feed in cat_feeds:
                outline = ET.SubElement(cat_el, "outline", type="rss", text=feed["title"], title=feed["title"], xmlUrl=feed["url"])
                if feed["site_url"]:
                    outline.set("htmlUrl", feed["site_url"])
    xml_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return Response(content=xml_bytes, media_type="application/xml", headers={"Content-Disposition": "attachment; filename=feeds.opml"})
