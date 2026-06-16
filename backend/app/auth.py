import uuid
from datetime import datetime, timedelta

from fastapi import Request, Depends, HTTPException, status

from app.database import get_connection
from app.models import UserOut


def create_session(user_id: int) -> str:
    token = str(uuid.uuid4())
    expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
            (user_id, token, expires_at),
        )
        conn.commit()
    finally:
        conn.close()
    return token


def get_current_user(request: Request) -> UserOut:
    token = request.cookies.get("rss_session")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.is_admin
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > datetime('now')
            """,
            (token,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return UserOut(id=row["id"], username=row["username"], is_admin=bool(row["is_admin"]))


def require_admin(user=Depends(get_current_user)) -> UserOut:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user
