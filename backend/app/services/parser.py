from datetime import datetime
from typing import Optional
import feedparser


def parse_feed(raw: bytes) -> Optional[dict]:
    result = feedparser.parse(raw)
    if result.bozo and not result.entries:
        return None

    feed = result.feed
    articles = []
    for entry in result.entries:
        guid = entry.get("id") or entry.get("link", "")
        url = entry.get("link")
        author = None
        if hasattr(entry, "author"):
            author = entry.author
        elif hasattr(entry, "authors") and entry.authors:
            author = entry.authors[0].get("name")
        summary = (entry.get("summary") or entry.get("description") or "")[:500] or None
        content = None
        if hasattr(entry, "content") and entry.content:
            content = entry.content[0].get("value", "")
        image_url = None
        if hasattr(entry, "media_content") and entry.media_content:
            image_url = entry.media_content[0].get("url")
        elif hasattr(entry, "links"):
            for link in entry.links:
                if link.get("type", "").startswith("image/"):
                    image_url = link.get("href")
                    break
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6]).isoformat()
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            published_at = datetime(*entry.updated_parsed[:6]).isoformat()
        articles.append({
            "guid": guid,
            "title": entry.get("title", "Untitled"),
            "url": url,
            "author": author,
            "summary": summary,
            "content": content,
            "image_url": image_url,
            "published_at": published_at,
        })

    return {
        "title": getattr(feed, "title", "Untitled Feed"),
        "site_url": getattr(feed, "link", None),
        "description": getattr(feed, "subtitle", getattr(feed, "description", None)),
        "icon_url": feed.image.href if hasattr(feed, "image") and hasattr(feed.image, "href") else None,
        "articles": articles,
    }
