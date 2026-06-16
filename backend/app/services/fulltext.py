from typing import Optional
import json
from urllib.parse import urlparse

import httpx

from app.config import settings

MAX_CONTENT_SIZE = 500_000
ALLOWED_SCHEMES = ("http", "https")
BLOCKED_HOSTNAMES = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]", "backend", "frontend", "fullfeedrss"}


def validate_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        return False
    host = parsed.hostname
    if not host:
        return False
    if host in BLOCKED_HOSTNAMES:
        return False
    if "." not in host:
        return False
    try:
        import ipaddress
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
    except ValueError:
        pass
    return True


async def enrich_article(url: str, timeout: int = 15) -> Optional[str]:
    if not validate_url(url):
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(
                settings.fulltext_rss_url,
                params={"url": url},
                headers={"User-Agent": "RSS-Reader-Pro/1.0"},
            )
            resp.raise_for_status()
            ct = resp.headers.get("content-type", "")
            if "json" in ct:
                data = resp.json()
                content = data.get("content") or data.get("excerpt") or ""
            else:
                content = resp.text
            if len(content) > MAX_CONTENT_SIZE:
                content = content[:MAX_CONTENT_SIZE] + "\n<!-- [truncated at 500KB] -->"
            return content
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException, json.JSONDecodeError):
        return None
