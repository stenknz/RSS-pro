import secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from passlib.hash import bcrypt

from app.database import get_connection
from app.models import RegisterBody, LoginBody
from app.auth import create_session, get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(body: RegisterBody):
    conn = get_connection()
    try:
        user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]

        if user_count > 0:
            if not body.invite_token:
                raise HTTPException(status_code=400, detail="Invite token required")
            invite = conn.execute(
                "SELECT id FROM invite_tokens WHERE token = ? AND used_by IS NULL",
                (body.invite_token,),
            ).fetchone()
            if not invite:
                raise HTTPException(status_code=400, detail="Invalid or used invite token")

        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (body.username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        is_admin = user_count == 0
        conn.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            (body.username, bcrypt.hash(body.password), 1 if is_admin else 0),
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
def login(body: LoginBody):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, is_admin FROM users WHERE username = ?",
            (body.username,),
        ).fetchone()
        if not row or not bcrypt.verify(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        token = create_session(row["id"])
        resp = JSONResponse({
            "ok": True,
            "user": {"id": row["id"], "username": row["username"], "is_admin": bool(row["is_admin"])},
        })
        resp.set_cookie(
            key="rss_session", value=token, httponly=True,
            samesite="lax", max_age=2592000, path="/",
        )
        return resp
    finally:
        conn.close()


@router.post("/logout")
def logout():
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
            "INSERT INTO invite_tokens (token, created_by) VALUES (?, ?)",
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
            "SELECT token, used_by, created_at FROM invite_tokens ORDER BY created_at DESC"
        ).fetchall()
        return [{"token": r["token"], "used": r["used_by"] is not None, "created_at": r["created_at"]} for r in rows]
    finally:
        conn.close()
