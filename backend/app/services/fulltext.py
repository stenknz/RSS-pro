from typing import Optional
import json
import httpx

from app.config import settings


async def enrich_article(url: str, timeout: int = 15) -> Optional[str]:
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
                return data.get("content") or data.get("excerpt")
            return resp.text
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException, json.JSONDecodeError):
        return None
