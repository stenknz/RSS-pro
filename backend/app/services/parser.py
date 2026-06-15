from datetime import datetime
from typing import List, Optional
import feedparser


class ParsedArticle:
    def __init__(
        self,
        guid: str,
        title: str,
        url: Optional[str] = None,
        author: Optional[str] = None,
        summary: Optional[str] = None,
        content: Optional[str] = None,
        image_url: Optional[str] = None,
        published_at: Optional[str] = None,
    ):
        self.guid = guid
        self.title = title
        self.url = url
        self.author = author
        self.summary = summary
        self.content = content
        self.image_url = image_url
        self.published_at = published_at


class ParsedFeed:
    def __init__(
        self,
        title: str,
        site_url: Optional[str] = None,
        description: Optional[str] = None,
        icon_url: Optional[str] = None,
        articles: Optional[List[ParsedArticle]] = None,
    ):
        self.title = title
        self.site_url = site_url
        self.description = description
        self.icon_url = icon_url
        self.articles = articles or []


def parse_feed(raw: bytes) -> Optional[ParsedFeed]:
    result = feedparser.parse(raw)
    if result.bozo and not result.entries:
        return None

    feed = result.feed
    title = getattr(feed, "title", "Untitled Feed")
    site_url = getattr(feed, "link", None)
    description = getattr(feed, "subtitle", getattr(feed, "description", None))
    icon_url = None
    if hasattr(feed, "image") and hasattr(feed.image, "href"):
        icon_url = feed.image.href

    articles = []
    for entry in result.entries:
        guid = entry.get("id") or entry.get("link", "")
        title = entry.get("title", "Untitled")
        url = entry.get("link")
        author = None
        if hasattr(entry, "author"):
            author = entry.author
        elif hasattr(entry, "authors") and entry.authors:
            author = entry.authors[0].get("name")
        summary = entry.get("summary", entry.get("description", ""))[:500] if entry.get("summary") or entry.get("description") else None
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
        articles.append(ParsedArticle(guid, title, url, author, summary, content, image_url, published_at))

    return ParsedFeed(title, site_url, description, icon_url, articles)
