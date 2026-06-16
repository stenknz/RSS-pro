# RSS Pro Reader

A full-stack RSS feed reader with a React frontend and Python/FastAPI backend.

## Features

- Subscribe to RSS/Atom feeds via URL or OPML import
- Group feeds into categories
- Read articles in a clean reading pane
- Save, star, and mark articles as read
- Search across all articles
- Dark mode
- Adjustable reading width and font size
- Dashboard with stats and quick actions
- Group articles by feed in the All Articles view

## Quick Start (Docker)

```bash
docker run -d -p 8000:8000 -v rss-data:/app/data stenknz/rss-pro-backend:latest
docker run -d -p 80:80 --link rss-pro-backend stenknz/rss-pro-frontend:latest
```

## Deploy with Portainer

Use the included `portainer-compose.yml` in a Portainer Stack:

1. Copy `portainer-compose.yml` into Portainer's Stack editor
2. Set environment variables `BACKEND_PORT` and `FRONTEND_PORT` if needed
3. Deploy the stack

The compose file pulls pre-built images from Docker Hub and uses a named volume for persistent storage.

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies API requests to the backend.

## Docker Images

- `stenknz/rss-pro-backend:latest` — Python/FastAPI backend (port 8000)
- `stenknz/rss-pro-frontend:latest` — React/nginx frontend (port 80)
