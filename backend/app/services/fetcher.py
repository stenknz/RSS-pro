from typing import Optional
import httpx


async def fetch_feed(url: str, timeout: int = 30) -> Optional[bytes]:
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "RSS-Reader-Pro/1.0"})
            resp.raise_for_status()
            return resp.content
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException):
        return None
