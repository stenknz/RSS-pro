# RSS Reader Pro — Design Specification

**Date:** 2026-06-15
**Stack:** Python (FastAPI) + SQLite + React (Vite) + Docker

## Overview

A modern, professional RSS/Atom feed aggregator delivered as a containerized web application. Single-user focus with a premium SaaS-style UI. Single Docker deployment (backend + nginx frontend via docker-compose).

## Architecture

### Approach: FastAPI Monolith with APScheduler

Single Python process handles both web requests and background feed refresh via APScheduler. SQLite WAL mode for safe concurrent reads. No external task queue — simplest deploy, no write contention risk.

### Project Structure

```
rss-reader-pro/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, lifespan, scheduler init
│   │   ├── config.py            # Settings from env vars
│   │   ├── database.py          # SQLite connection & schema init
│   │   ├── models.py            # Pydantic models (DB & API schemas)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── feeds.py         # CRUD + refresh
│   │   │   ├── articles.py      # Read, search, save, star
│   │   │   ├── categories.py    # CRUD + feed assignment
│   │   │   ├── stats.py         # Dashboard statistics
│   │   │   └── opml.py          # Import/export
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── fetcher.py       # HTTP fetch feeds (httpx)
│   │       ├── parser.py        # RSS/Atom parsing (feedparser)
│   │       └── scheduler.py     # APScheduler per-feed intervals
│   ├── tests/
│   │   ├── test_feeds.py
│   │   ├── test_articles.py
│   │   ├── test_categories.py
│   │   └── test_opml.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts        # Axios instance, API functions
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ArticleList.tsx
│   │   │   │   └── ReadingPane.tsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   ├── FeedManager/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Toast.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FeedView.tsx
│   │   │   ├── CategoryView.tsx
│   │   │   ├── AllArticles.tsx
│   │   │   ├── SavedView.tsx
│   │   │   ├── Search.tsx
│   │   │   └── Settings.tsx
│   │   ├── stores/
│   │   │   ├── feedStore.ts
│   │   │   ├── articleStore.ts
│   │   │   ├── categoryStore.ts
│   │   │   └── uiStore.ts
│   │   ├── hooks/
│   │   │   ├── useFeeds.ts
│   │   │   ├── useArticles.ts
│   │   │   ├── useCategories.ts
│   │   │   └── useSearch.ts
│   │   └── styles/
│   │       └── index.css        # Tailwind imports
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Database Schema

### `feeds`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| title | TEXT | NOT NULL | |
| url | TEXT | NOT NULL UNIQUE | The RSS/Atom XML URL |
| site_url | TEXT | | Website homepage |
| description | TEXT | | Feed description from XML |
| icon_url | TEXT | | Favicon or feed icon |
| category_id | INTEGER | REFERENCES categories(id) ON DELETE SET NULL | nullable |
| enabled | INTEGER | NOT NULL DEFAULT 1 | 0 = disabled |
| refresh_interval | INTEGER | NOT NULL DEFAULT 30 | minutes |
| error_count | INTEGER | NOT NULL DEFAULT 0 | consecutive errors |
| last_fetched_at | TEXT | | ISO 8601 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |

### `categories`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| name | TEXT | NOT NULL UNIQUE | |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |

### `articles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| feed_id | INTEGER | NOT NULL REFERENCES feeds(id) ON DELETE CASCADE | |
| guid | TEXT | NOT NULL | per-feed unique ID |
| title | TEXT | NOT NULL | |
| url | TEXT | | Link to original |
| author | TEXT | | |
| summary | TEXT | | First ~500 chars |
| content | TEXT | | Full HTML |
| image_url | TEXT | | Featured image |
| published_at | TEXT | | ISO 8601 |
| is_read | INTEGER | NOT NULL DEFAULT 0 | |
| is_saved | INTEGER | NOT NULL DEFAULT 0 | |
| is_starred | INTEGER | NOT NULL DEFAULT 0 | |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |

**Indexes:**
- `articles(feed_id, published_at DESC)`
- `articles(is_read, published_at DESC)`
- `articles(is_saved, published_at DESC)`
- `UNIQUE(feed_id, guid)` — dedup
- `sqlite FTS5` index on `articles(title, summary, content)` for search

## API Routes

All routes under `/api/v1/`.

### Feeds
```
POST   /feeds                          Body: { url, category_id? }
GET    /feeds                          Query: ?category_id=
PUT    /feeds/:id                      Body: { title?, url?, category_id?, refresh_interval?, enabled? }
DELETE /feeds/:id
POST   /feeds/:id/refresh
POST   /feeds/refresh-all
```

### Articles
```
GET    /feeds/:id/articles             Query: ?page=&per_page=&unread=&saved=
GET    /articles                       Query: ?page=&per_page=&feed_id=&category_id=&unread=&saved=&starred=
GET    /articles/:id
PATCH  /articles/:id                   Body: { is_read?, is_saved?, is_starred? }
POST   /articles/search                Body: { query, page?, per_page?, feed_id?, category_id?, unread?, saved? }
```

### Categories
```
GET    /categories                     Returns: [{ id, name, feed_count }]
POST   /categories                     Body: { name }
PUT    /categories/:id                 Body: { name }
DELETE /categories/:id
```

### OPML
```
POST   /opml/import                    File upload (multipart)
GET    /opml/export                    Returns: application/xml
```

### Stats
```
GET    /stats                          Returns: { total_feeds, unread_count, read_today, saved_count, ... }
```

## Frontend

### Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- React Router v6
- Zustand (state management)
- TanStack Query (server state / caching)
- Tailwind CSS (styling)
- Axios (HTTP client)
- react-markdown (for safe content rendering)

### Routes
| Path | Component | Description |
|---|---|---|
| `/` | Dashboard | Stats, recent activity, quick actions |
| `/feeds` | FeedList | Manage all feeds |
| `/feed/:id` | FeedView | Articles for a feed |
| `/category/:id` | CategoryView | Articles in a category |
| `/articles` | AllArticles | Combined unread view |
| `/saved` | SavedView | Saved + starred articles |
| `/search` | Search | Full-text search |
| `/settings` | Settings | Appearance, data, feed prefs |

### Layout (Desktop)

```
┌──────────┬──────────────────────┬─────────────────────────────┐
│          │                      │                             │
│ Sidebar  │   Article List       │     Reading Pane            │
│ 250px    │   400px              │     (flex 1)                │
│          │                      │                             │
│ - Feeds  │ • Article 1          │  ┌─────────────────────┐   │
│ - Cat 1  │ • Article 2          │  │  Title              │   │
│   - FeedA│ • Article 3 ★       │  │  Author · Date       │   │
│ - Cat 2  │ • Article 4          │  │  ┌─────┐             │   │
│   - FeedB│                      │  │  │ img │             │   │
│ - Saved  │                      │  │  └─────┘             │   │
│ - Search │                      │  │  Content...          │   │
│          │                      │  │                      │   │
│ Settings │                      │  │                      │   │
└──────────┴──────────────────────┴─────────────────────────────┘
```

On mobile: sidebar becomes a slide-over drawer, article list fills screen, reading pane opens as a new "page".

### State Stores (Zustand)
- `feedStore` — feed list, CRUD operations, active feed
- `articleStore` — current article list, active article, pagination
- `categoryStore` — categories with feed counts
- `uiStore` — sidebar open, theme (light/dark), reading mode, font size

### Data Fetching (TanStack Query)
- `useFeeds()` — query + mutation hooks
- `useArticles(feedId?, filters?)` — paginated feed articles
- `useArticle(id)` — single article detail
- `useCategories()` — categories with counts
- `useSearch(query, filters)` — debounced search
- Poll unread count every 60s; stale data refetch on window focus

## Backend Services

### fetcher.py
- Uses `httpx.AsyncClient` with 30s timeout
- Handles redirects, gzip/deflate encoding
- Returns raw bytes + response headers

### parser.py
- Uses `feedparser.parse()` on raw bytes
- Extracts: title, link, description, articles (guid, title, link, author, summary, content, published, image)
- Handles both RSS 2.0 and Atom
- Falls back gracefully on bozo exceptions

### scheduler.py
- APScheduler `AsyncIOScheduler` started in FastAPI lifespan
- On feed create/update: schedules job at `refresh_interval`
- On refresh: fetches, parses, inserts new articles, updates `last_fetched_at`
- On consecutive error count >= 3: auto-disable feed
- On startup: re-schedule all enabled feeds

## Background Refresh Flow

1. Scheduler triggers per-feed job
2. `fetcher.py` GETs the feed URL
3. `parser.py` parses XML → list of articles
4. For each article: `INSERT OR IGNORE` into articles
5. Update `feed.last_fetched_at` and reset `error_count`
6. On error: increment `error_count`, disable if >= 3

Manual refresh (via API) follows same path but awaits result.

## Error Handling

### Backend
- 400: Invalid URL / not an RSS feed / missing field
- 404: Feed/article/category not found
- 409: Duplicate feed URL
- 500: Unexpected — logged, user gets "Something went wrong"
- Network errors (timeout, DNS failure): caught in fetcher, feed disabled after 3 consecutive

### Frontend
- React Error Boundary around reading pane + article list
- Toast notifications (auto-dismiss) for background errors
- Form inline validation (URL format, required fields)
- EmptyState component for: no feeds, no articles, no results, no saved items

## Docker

### docker-compose.yml
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/app/data  # SQLite persistence
    environment:
      - DATABASE_URL=sqlite:///app/data/rss.db
      - LOG_LEVEL=INFO
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on:
      - backend
    restart: unless-stopped
```

### Backend Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile (multi-stage)
```dockerfile
# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### nginx.conf
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Testing

### Backend
- Framework: `pytest`, `httpx` (AsyncClient for FastAPI tests)
- Database: SQLite in-memory, create tables before each test
- Coverage: feed CRUD, article CRUD, category CRUD, OPML import/export, search, duplicate detection, error handling
- Mock: `httpx` for fetcher, mock `feedparser` for parser unit tests

### Frontend
- Framework: `vitest` + `@testing-library/react`
- Render tests for major components
- Store logic tests
- MSW for API mocking in integration tests

## Key Dependencies

### Backend
- `fastapi` + `uvicorn[standard]`
- `httpx` (async HTTP)
- `feedparser` (RSS/Atom parsing)
- `apscheduler` (background scheduling)
- `python-multipart` (OPML upload)
- `pydantic` (validation)

### Frontend
- `react`, `react-dom`, `react-router-dom`
- `zustand` (state)
- `@tanstack/react-query` (server state)
- `axios` (HTTP)
- `tailwindcss`, `postcss`, `autoprefixer`
- `@tailwindcss/typography` (article content)

## Excluded from MVP Scope
- Multi-user/auth (single-user app)
- Reading streak / analytics
- Article recommendations
- Push notifications / daily digest
- Saved article collections / notes / tagging
- Split-screen / distraction-free modes (basic reader mode included)
- Keyboard navigation shortcuts (basic nav only)
- PWA / offline support
