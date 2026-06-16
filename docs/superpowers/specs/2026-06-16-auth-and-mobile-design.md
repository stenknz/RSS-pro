# Auth System & Mobile Layout Design

## Overview

Add multi-user authentication (invite-only) and responsive mobile layout to RSS Read Pro.

---

## Auth System

### Data Model

**users table:**
| Column | Type | Notes |
|---|---|---|
| id | int (PK) | auto |
| username | text (unique) | |
| password_hash | text | bcrypt via passlib |
| is_admin | bool | first user is admin |
| created_at | datetime | |

**sessions table:**
| Column | Type | Notes |
|---|---|---|
| id | int (PK) | auto |
| user_id | int (FK → users) | |
| token | text (unique) | UUID4 |
| expires_at | datetime | 30 days from creation |
| created_at | datetime | |

**invite_tokens table:**
| Column | Type | Notes |
|---|---|---|
| id | int (PK) | auto |
| token | text (unique) | random URL-safe string |
| created_by | int (FK → users) | admin who created it |
| used_by | int (FK → users, nullable) | null until used |
| created_at | datetime | |

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/v1/auth/register | None (requires invite_token) | Create account |
| POST | /api/v1/auth/login | None | Login, set session cookie |
| POST | /api/v1/auth/logout | Session | Clear session |
| GET | /api/v1/auth/me | Session | Return current user or 401 |
| POST | /api/v1/auth/invites | Session + Admin | Create invite token |
| GET | /api/v1/auth/invites | Session + Admin | List invite tokens |

**POST /register** body: `{ "username": "...", "password": "...", "invite_token": "..." }`
- If no users exist yet, the first registration bypasses invite_token and creates an admin.

**POST /login** body: `{ "username": "...", "password": "..." }`
- On success, sets `Set-Cookie: rss_session=<token>; HttpOnly; SameSite=Lax; Max-Age=2592000; Path=/`

### Auth Middleware

FastAPI dependency that reads the `rss_session` cookie, looks up the session token in the DB, checks expiry, and returns the user or raises 401.

### Frontend — Auth Flow

- **App boot:** `GET /api/v1/auth/me` → if 401, redirect to `/login`
- **Login page** (`/login`): username + password form → POST /login → redirect to `/`
- **Register page** (`/register?token=XYZ`): username + password + token → POST /register → redirect to `/login`
- **Logout button** in sidebar or Settings → POST /logout → redirect to `/login`
- **Axios interceptor:** on any 401 response, redirect to `/login`
- **Admin invite management:** in Settings page, "Invites" section with "Generate Link" button and list of existing invites

### Backend Dependencies

Add `passlib[bcrypt]` to `requirements.txt`.

### Seed / First-Run

On first run (users table empty), the register endpoint accepts registration without an invite token and sets `is_admin = True`.

---

## Mobile Layout

### Breakpoint

`768px` — everything below gets the mobile layout. This covers iPhone 14 (390px) and 15 Pro (393px).

### Sidebar → Hamburger Drawer

- Below 768px, the fixed sidebar div is hidden (`hidden md:flex`)
- A top bar replaces it: hamburger icon (left) + "RSS Reader" title (center)
- Tapping hamburger opens a slide-in overlay from the left (fixed, z-50, w-72)
- Overlay contains full sidebar content (nav links, categories, dark mode toggle)
- Tapping a nav link or the backdrop closes the drawer
- State managed by `useUIStore.sidebarOpen` (already exists but repurposed for mobile)

### Article List → Full Width

- `md:w-80` becomes `w-full` on mobile
- Filter tabs (All / Unread / Saved) remain at top, scroll horizontally if needed
- Each article row remains the same, just full-width

### Reading Pane → Full Screen Detail

- When an article is selected on mobile, the reading pane takes over the full screen
- The article list is hidden (or the user is navigated to a separate route)
- A back arrow button at the top of the reading pane returns to the article list
- Article action buttons shrink to icons only (no text labels)

**Approach:** Use URL-based navigation for the reading pane on mobile:
- Desktop: article list and reading pane are side by side (as now)
- Mobile: `/articles` shows list, `/articles/:id` shows reading pane
- This avoids complex layout state management

### Other Pages

- Dashboard cards: `grid-cols-2 md:grid-cols-4`
- Settings and other pages: full-width with `px-4` instead of `px-8`
- Quick actions: already wrap, just needs padding adjustments

### Implementation Strategy

- Use Tailwind responsive prefixes throughout
- No separate mobile components — the same components adapt via CSS
- The MobileMenu (hamburger) component is a new small component
- A `useIsMobile` hook or CSS-driven approach to determine layout

### Routes (Mobile)

| Route | Mobile Behavior |
|---|---|
| `/` | Dashboard (full width) |
| `/articles` | Article list (full width) |
| `/articles/:id` | Reading pane (full screen, back button) |
| `/feeds` | Feed manager (full width) |
| `/settings` | Settings (full width) |
| `/starred`, `/saved`, `/search` | Similar to /articles |
| `/login`, `/register` | Full width, no sidebar |

Desktop routes remain unchanged.

### Files to Modify

- `MainLayout.tsx` — add mobile top bar, conditionally render sidebar vs hamburger
- `ReadingPane.tsx` — add `onBack` prop, back button, icon-only action buttons on mobile
- `ArticleList.tsx` — no changes needed (already adaptive)
- `Sidebar.tsx` — no changes needed (reused in mobile drawer)
- `Dashboard.tsx` — padding adjustments
- `App.tsx` — add auth routes, auth guard, mobile article route
- `AllArticles.tsx`, `CategoryView.tsx`, `SavedView.tsx`, etc. — add mobile routing for reading pane
- New: `components/Auth/LoginPage.tsx`, `components/Auth/RegisterPage.tsx`, `components/Auth/AuthGuard.tsx`
- New: `components/Layout/MobileMenu.tsx`

### Non-Goals

- No PWA / offline support
- No tablet-specific layout (768px+ uses desktop layout)
- No swipe gestures
