import secrets
from time import time
from datetime import datetime
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import get_connection
from app.models import RegisterBody
from app.auth import create_session, get_current_user, require_admin

_login_attempts: dict[str, list[float]] = {}

def _check_login_rate(ip: str) -> None:
    now = time()
    if ip not in _login_attempts:
        _login_attempts[ip] = []
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < 60]
    if len(_login_attempts[ip]) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")
    _login_attempts[ip].append(now)


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register")
def register(body: RegisterBody):
    conn = get_connection()
    try:
        user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]

        if user_count > 0:
            if not body.invite_token:
                raise HTTPException(status_code=400, detail="Invite token required")
            invite = conn.execute(
                "SELECT id FROM invite_tokens WHERE token = ? AND used_by IS NULL AND expires_at > datetime('now')",
                (body.invite_token,),
            ).fetchone()
            if not invite:
                raise HTTPException(status_code=400, detail="Invalid or expired invite token")

        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (body.username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        is_admin = user_count == 0
        conn.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            (body.username, bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"), 1 if is_admin else 0),
        )
        conn.commit()

        if body.invite_token:
            conn.execute(
                "UPDATE invite_tokens SET used_by = (SELECT id FROM users WHERE username = ?) WHERE token = ?",
                (body.username, body.invite_token),
            )
            conn.commit()

        return {"ok": True}
    finally:
        conn.close()


@router.post("/login")
def login(body: dict, request: Request):
    _check_login_rate(request.client.host)
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, is_admin FROM users WHERE username = ?",
            (body.get("username", ""),),
        ).fetchone()
        if not row or not bcrypt.checkpw(body.get("password", "").encode("utf-8"), row["password_hash"].encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        token = create_session(row["id"])
        resp = JSONResponse({
            "ok": True,
            "user": {"id": row["id"], "username": row["username"], "is_admin": bool(row["is_admin"])},
        })
        resp.set_cookie(
            key="rss_session", value=token, httponly=True,
            samesite="lax", secure=settings.secure_cookies,
            max_age=2592000, path="/",
        )
        return resp
    finally:
        conn.close()


@router.post("/logout")
def logout(request: Request, user=Depends(get_current_user)):
    token = request.cookies.get("rss_session")
    if token:
        conn = get_connection()
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(key="rss_session", path="/")
    return resp


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


@router.post("/invites")
def create_invite(user=Depends(require_admin)):
    token = secrets.token_urlsafe(32)
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO invite_tokens (token, created_by, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
            (token, user.id),
        )
        conn.commit()
        return {"token": token, "url": f"/register?token={token}"}
    finally:
        conn.close()


@router.get("/invites")
def list_invites(user=Depends(require_admin)):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT token, used_by, created_at, expires_at FROM invite_tokens ORDER BY created_at DESC"
        ).fetchall()
        now = datetime.utcnow().isoformat()
        return [{
            "token": r["token"][:8] + "...",
            "used": r["used_by"] is not None,
            "created_at": r["created_at"],
            "expired": r["expires_at"] < now,
        } for r in rows]
    finally:
        conn.close()
