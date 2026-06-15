import os
import tempfile

import pytest
from httpx import AsyncClient, ASGITransport

from app.config import settings

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
settings.database_url = f"sqlite:///{_db_path}"

from app.main import app
from app.database import init_db, get_connection


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield
    conn = get_connection()
    conn.execute("PRAGMA foreign_keys=OFF")
    conn.execute("DELETE FROM articles")
    conn.execute("DELETE FROM feeds")
    conn.execute("DELETE FROM categories")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.commit()
    conn.close()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
