# Auth System & Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-user invite-only authentication and responsive mobile layout

**Architecture:** Session-based auth with server-side sessions stored in SQLite. Mobile layout uses Tailwind responsive prefixes with a hamburger drawer for the sidebar and full-screen reading pane on small screens.

**Tech Stack:** FastAPI, SQLite, passlib[bcrypt], React, Tailwind CSS

---

## File Map

### New Files
| File | Purpose |
|---|---|
| `backend/app/auth.py` | Auth dependency/middleware (get_current_user) |
| `backend/app/routers/auth.py` | Auth API endpoints |
| `frontend/src/components/Auth/LoginPage.tsx` | Login form |
| `frontend/src/components/Auth/RegisterPage.tsx` | Registration form with invite token |
| `frontend/src/components/Auth/AuthGuard.tsx` | Route wrapper checking auth |
| `frontend/src/components/Layout/MobileTopBar.tsx` | Hamburger + title bar for mobile |

### Modified Files
| File | Change |
|---|---|
| `backend/app/models.py` | Add User, Session, InviteToken models |
| `backend/app/database.py` | Import new models, init tables |
| `backend/app/main.py` | Include auth router, add CORS for credentials |
| `backend/requirements.txt` | Add passlib[bcrypt] |
| `frontend/src/api/client.ts` | Add auth API methods, 401 interceptor |
| `frontend/src/App.tsx` | Add auth routes, AuthGuard, mobile article route |
| `frontend/src/components/Layout/MainLayout.tsx` | Responsive sidebar + mobile top bar |
| `frontend/src/components/Layout/ReadingPane.tsx` | Add onBack prop, back button on mobile |
| `frontend/src/pages/AllArticles.tsx` | Mobile routing for reading pane |
| `frontend/src/pages/CategoryView.tsx` | Mobile routing for reading pane |
| `frontend/src/pages/SavedView.tsx` | Mobile routing for reading pane |
| `frontend/src/pages/StarredView.tsx` | Mobile routing for reading pane |
| `frontend/src/pages/SearchPage.tsx` | Mobile routing for reading pane |
| `frontend/src/pages/SettingsPage.tsx` | Add invite management UI |

---

### Task 1: Backend Auth Models

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Add User, Session, InviteToken models**

Add to `backend/app/models.py`:

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class InviteToken(Base):
    __tablename__ = "invite_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

Add imports at top:
```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
```

- [ ] **Step 2: Run backend tests to verify no regressions**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: add User, Session, InviteToken models"
```

---

### Task 2: Backend Auth Dependencies

**Files:**
- Create: `backend/app/auth.py`

- [ ] **Step 1: Create auth dependency**

Write `backend/app/auth.py`:

```python
import uuid
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from .database import SessionLocal
from .models import Session

def create_session(db, user_id: int) -> str:
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=30)
    session = Session(user_id=user_id, token=token, expires_at=expires_at)
    db.add(session)
    db.commit()
    return token

def get_current_user(request: Request):
    token = request.cookies.get("rss_session")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    db = SessionLocal()
    try:
        session = db.query(Session).filter(
            Session.token == token,
            Session.expires_at > datetime.utcnow()
        ).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return user
    finally:
        db.close()

def require_admin(user = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user
```

Need to add import for User:
```python
from .models import User, Session
from fastapi import Depends
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/auth.py
git commit -m "feat: add auth dependencies and session management"
```

---

### Task 3: Backend Auth Endpoints

**Files:**
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Create auth router**

Write `backend/app/routers/auth.py`:

```python
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from passlib.hash import bcrypt
from datetime import datetime

from ..database import SessionLocal
from ..models import User, InviteToken
from ..auth import create_session, get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterBody(BaseModel):
    username: str
    password: str
    invite_token: str | None = None

class LoginBody(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(body: RegisterBody):
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            # First user — auto-admin, no invite needed
            pass
        elif not body.invite_token:
            raise HTTPException(status_code=400, detail="Invite token required")
        else:
            invite = db.query(InviteToken).filter(
                InviteToken.token == body.invite_token,
                InviteToken.used_by.is_(None)
            ).first()
            if not invite:
                raise HTTPException(status_code=400, detail="Invalid or used invite token")

        existing = db.query(User).filter(User.username == body.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        user = User(
            username=body.username,
            password_hash=bcrypt.hash(body.password),
            is_admin=(db.query(User).count() == 0)
        )
        db.add(user)
        db.flush()

        if body.invite_token:
            invite = db.query(InviteToken).filter(InviteToken.token == body.invite_token).first()
            if invite:
                invite.used_by = user.id

        db.commit()
        return {"ok": True}
    finally:
        db.close()

@router.post("/login")
def login(body: LoginBody, request: Request):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == body.username).first()
        if not user or not bcrypt.verify(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        token = create_session(db, user.id)
        resp = JSONResponse({"ok": True, "user": {"id": user.id, "username": user.username, "is_admin": user.is_admin}})
        resp.set_cookie(key="rss_session", value=token, httponly=True, samesite="lax", max_age=2592000, path="/")
        return resp
    finally:
        db.close()

@router.post("/logout")
def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(key="rss_session", path="/")
    return resp

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "is_admin": user.is_admin}

@router.post("/invites")
def create_invite(user=Depends(require_admin)):
    db = SessionLocal()
    try:
        token = secrets.token_urlsafe(32)
        invite = InviteToken(token=token, created_by=user.id)
        db.add(invite)
        db.commit()
        return {"token": token, "url": f"/register?token={token}"}
    finally:
        db.close()

@router.get("/invites")
def list_invites(user=Depends(require_admin)):
    db = SessionLocal()
    try:
        invites = db.query(InviteToken).order_by(InviteToken.created_at.desc()).all()
        return [{"token": i.token, "used": i.used_by is not None, "created_at": i.created_at.isoformat()} for i in invites]
    finally:
        db.close()
```

- [ ] **Step 2: Register router in main.py**

Add to `backend/app/main.py`:
```python
from .routers import auth as auth_router
app.include_router(auth_router)
```

- [ ] **Step 3: Add passlib to requirements**

Add to `backend/requirements.txt`:
```
passlib[bcrypt]
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pip install passlib[bcrypt]
python -m pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/auth.py backend/app/main.py backend/requirements.txt
git commit -m "feat: add auth endpoints — register, login, logout, me, invites"
```

---

### Task 4: Frontend Auth API Client & Interceptor

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add auth API methods**

Add to `frontend/src/api/client.ts`:

```typescript
export const authApi = {
  me: () => api.get<{ id: number; username: string; is_admin: boolean }>('/auth/me').then(r => r.data),
  login: (username: string, password: string) => api.post('/auth/login', { username, password }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  register: (username: string, password: string, invite_token: string) =>
    api.post('/auth/register', { username, password, invite_token }).then(r => r.data),
  createInvite: () => api.post<{ token: string; url: string }>('/auth/invites').then(r => r.data),
  listInvites: () => api.get<{ token: string; used: boolean; created_at: string }[]>('/auth/invites').then(r => r.data),
}
```

- [ ] **Step 2: Add 401 interceptor**

After the `api` axios instance creation, add:

```typescript
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat: add auth API methods and 401 interceptor"
```

---

### Task 5: Frontend Login & Register Pages

**Files:**
- Create: `frontend/src/components/Auth/LoginPage.tsx`
- Create: `frontend/src/components/Auth/RegisterPage.tsx`

- [ ] **Step 1: Create LoginPage**

Write `frontend/src/components/Auth/LoginPage.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await authApi.login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">RSS Reader</h1>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sign in</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Sign in</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RegisterPage**

Write `frontend/src/components/Auth/RegisterPage.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await authApi.register(username, password, token)
      navigate('/login')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">RSS Reader</h1>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create account</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Create account</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Auth/
git commit -m "feat: add login and register pages"
```

---

### Task 6: Frontend AuthGuard and App Routing

**Files:**
- Create: `frontend/src/components/Auth/AuthGuard.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create AuthGuard**

Write `frontend/src/components/Auth/AuthGuard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/client'

export default function AuthGuard() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    authApi.me().then(() => setReady(true)).catch(() => navigate('/login'))
  }, [])

  if (!ready) return null
  return <Outlet />
}
```

- [ ] **Step 2: Update App.tsx**

Replace the existing routes:

```tsx
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import AuthGuard from './components/Auth/AuthGuard'
import LoginPage from './components/Auth/LoginPage'
import RegisterPage from './components/Auth/RegisterPage'
import Dashboard from './pages/Dashboard'
import AllArticles from './pages/AllArticles'
import FeedManager from './pages/FeedManager'
import CategoryView from './pages/CategoryView'
import SavedView from './pages/SavedView'
import StarredView from './pages/StarredView'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import ReadingPane from './components/Layout/ReadingPane'
import { useUIStore } from './stores/uiStore'

export default function App() {
  const { theme } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<AllArticles />} />
          <Route path="articles/:id" element={<AllArticles />} />
          <Route path="feeds" element={<FeedManager />} />
          <Route path="category/:id" element={<CategoryView />} />
          <Route path="saved" element={<SavedView />} />
          <Route path="starred" element={<StarredView />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Auth/AuthGuard.tsx frontend/src/App.tsx
git commit -m "feat: add AuthGuard and auth routes"
```

---

### Task 7: Frontend Invite Management in Settings

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add invite management UI**

Add to `SettingsPage.tsx` after the Data section:

```tsx
import { useState, useEffect } from 'react'
import { authApi } from '../api/client'

// Inside component:
const [invites, setInvites] = useState<{ token: string; used: boolean; created_at: string }[]>([])
const [showInvites, setShowInvites] = useState(false)

useEffect(() => {
  if (showInvites) {
    authApi.listInvites().then(setInvites).catch(() => {})
  }
}, [showInvites])

const handleGenerateInvite = async () => {
  try {
    const result = await authApi.createInvite()
    navigator.clipboard.writeText(`${window.location.origin}${result.url}`)
    alert(`Invite link copied to clipboard: ${window.location.origin}${result.url}`)
    authApi.listInvites().then(setInvites).catch(() => {})
  } catch {
    alert('Failed to generate invite')
  }
}
```

Add the invite UI section inside the settings div:

```tsx
<section className="mt-8">
  <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Invites</h2>
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
    <div className="px-5 py-4">
      <button onClick={() => setShowInvites(!showInvites)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
        {showInvites ? 'Hide' : 'Manage'} invite links
      </button>
    </div>
    {showInvites && (
      <>
        <div className="px-5 py-3">
          <button onClick={handleGenerateInvite} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Generate new invite link
          </button>
        </div>
        {invites.map((inv) => (
          <div key={inv.token} className="flex items-center justify-between px-5 py-3">
            <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{inv.token.slice(0, 16)}...</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.used ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
              {inv.used ? 'Used' : 'Active'}
            </span>
          </div>
        ))}
      </>
    )}
  </div>
</section>
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SettingsPage.tsx
git commit -m "feat: add invite management UI to settings"
```

---

### Task 8: Mobile Top Bar Component

**Files:**
- Create: `frontend/src/components/Layout/MobileTopBar.tsx`
- Create custom hook or use useUIStore for mobile sidebar state

- [ ] **Step 1: Create MobileTopBar**

Write `frontend/src/components/Layout/MobileTopBar.tsx`:

```tsx
import { useUIStore } from '../../stores/uiStore'

export default function MobileTopBar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#09090b]">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 -ml-1 text-gray-600 dark:text-gray-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">RSS Reader</h1>
      <div className="w-8" />
    </div>
  )
}
```

Add `sidebarOpen` to the uiStore if not already there — it already exists in `frontend/src/stores/uiStore.ts`.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout/MobileTopBar.tsx
git commit -m "feat: add mobile top bar with hamburger menu"
```

---

### Task 9: Responsive MainLayout + Mobile Sidebar Drawer

**Files:**
- Modify: `frontend/src/components/Layout/MainLayout.tsx`

- [ ] **Step 1: Update MainLayout**

Rewrite `MainLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileTopBar from './MobileTopBar'
import { useUIStore } from '../../stores/uiStore'

export default function MainLayout() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#09090b]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-950 shadow-xl z-50 overflow-y-auto">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0c0c0f]">
        <MobileTopBar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout/MainLayout.tsx
git commit -m "feat: responsive layout with mobile sidebar drawer"
```

---

### Task 10: Mobile Reading Pane with Back Button

**Files:**
- Modify: `frontend/src/components/Layout/ReadingPane.tsx`

- [ ] **Step 1: Update ReadingPane with onBack prop and responsive styling**

Add `onBack` to the interface and render a back button on mobile. Replace action buttons with icon-only on mobile.

```tsx
interface ReadingPaneProps {
  article: Article | null
  onUpdate?: (article: Article) => void
  onBack?: () => void
  isMobile?: boolean
}
```

Inside the return, add a back button before the article content (only when `onBack` is provided and `isMobile`):

```tsx
{onBack && (
  <button onClick={onBack} className="md:hidden flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 hover:text-gray-700 dark:hover:text-gray-300">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Back
  </button>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout/ReadingPane.tsx
git commit -m "feat: add mobile back button to reading pane"
```

---

### Task 11: Mobile Article Routing

**Files:**
- Modify: `frontend/src/pages/AllArticles.tsx`
- Modify: `frontend/src/pages/CategoryView.tsx`
- Modify: `frontend/src/pages/SavedView.tsx`
- Modify: `frontend/src/pages/StarredView.tsx`
- Modify: `frontend/src/pages/SearchPage.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` (padding)

- [ ] **Step 1: Update AllArticles for mobile routing**

Add `useParams` and `useNavigate` to `AllArticles.tsx`. When a `:id` param is present (mobile route), show only the reading pane for that article. When no param, show the article list.

```tsx
import { useParams, useNavigate } from 'react-router-dom'

// Inside component:
const { id } = useParams()
const navigate = useNavigate()

// When id is set (mobile), show only ReadingPane
if (id) {
  const article = articles.find(a => a.id === Number(id))
  if (!article) return <div className="p-8 text-sm text-gray-400">Loading...</div>
  return (
    <div className="flex h-full">
      <ReadingPane article={article} onUpdate={(a) => {
        setArticles(prev => prev.map(p => p.id === a.id ? a : p))
        setSelected(a)
      }} onBack={() => navigate('/articles')} isMobile={true} />
    </div>
  )
}
```

- [ ] **Step 2: Apply similar pattern to CategoryView, SavedView, StarredView, SearchPage**

Each gets the same treatment — when `id` param is present, show just the ReadingPane with a back button.

- [ ] **Step 3: Dashboard — responsive padding**

Change `p-8` to `p-4 md:p-8` in Dashboard.tsx.

- [ ] **Step 4: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: mobile article routing with full-screen reading pane"
```

---

### Task 12: Responsive Dashboard Cards

**Files:**
- Modify: `frontend/src/components/Dashboard/StatsCards.tsx`

- [ ] **Step 1: Update grid to be responsive**

Change `grid-cols-2 md:grid-cols-4` to keep as is — it already is `grid-cols-2 md:grid-cols-4`. Just verify.

- [ ] **Step 2: Full build check**

```bash
cd frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Run all tests**

```bash
cd frontend
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: responsive dashboard cards"
```
