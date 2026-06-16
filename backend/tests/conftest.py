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


def _create_test_user():
    import bcrypt
    conn = get_connection()
    existing = conn.execute("SELECT id FROM users WHERE username = 'testuser'").fetchone()
    if existing:
        user_id = existing["id"]
    else:
        conn.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            ("testuser", bcrypt.hashpw(b"testpass123", bcrypt.gensalt()).decode(), 1),
        )
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username = 'testuser'").fetchone()["id"]
    from app.auth import create_session
    token = create_session(user_id)
    conn.close()
    return token


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield
    conn = get_connection()
    conn.execute("PRAGMA foreign_keys=OFF")
    for table in ("articles", "feeds", "categories", "sessions", "invite_tokens", "users"):
        conn.execute(f"DELETE FROM {table}")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.commit()
    conn.close()


@pytest.fixture
async def auth_client():
    token = _create_test_user()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.cookies.set("rss_session", token)
        yield ac
