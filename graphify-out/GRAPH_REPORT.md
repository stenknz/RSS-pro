# Graph Report - .  (2026-06-16)

## Corpus Check
- Corpus is ~18,697 words - fits in a single context window. You may not need a graph.

## Summary
- 257 nodes · 437 edges · 20 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Core & Database|Backend Core & Database]]
- [[_COMMUNITY_Frontend API Client|Frontend API Client]]
- [[_COMMUNITY_Backend API Routers|Backend API Routers]]
- [[_COMMUNITY_Frontend UI Layout & Pages|Frontend UI Layout & Pages]]
- [[_COMMUNITY_Data Models & Schemas|Data Models & Schemas]]
- [[_COMMUNITY_Frontend TypeScript Config|Frontend TypeScript Config]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Frontend Dev Dependencies|Frontend Dev Dependencies]]
- [[_COMMUNITY_Feed Fetcher & Parser|Feed Fetcher & Parser]]

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 28 edges
2. `RSS Reader Pro Design Specification` - 26 edges
3. `RSS Reader Pro Implementation Plan` - 21 edges
4. `compilerOptions` - 17 edges
5. `Article` - 11 edges
6. `Database Schema (SQLite Init with WAL + FTS5)` - 9 edges
7. `useUIStore` - 8 edges
8. `Scheduler Service (APScheduler AsyncIOScheduler)` - 8 edges
9. `FastAPI` - 7 edges
10. `scripts` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Entry HTML` --conceptually_related_to--> `React Components (MainLayout, Sidebar, ArticleList, ReadingPane, EmptyState)`  [INFERRED]
  frontend/index.html → docs/superpowers/plans/2026-06-15-rss-reader-pro-implementation.md
- `Feed Parser Service (feedparser for RSS/Atom)` --references--> `feedparser RSS/Atom Parsing Library`  [EXTRACTED]
  docs/superpowers/plans/2026-06-15-rss-reader-pro-implementation.md → backend/requirements.txt
- `Scheduler Service (APScheduler AsyncIOScheduler)` --references--> `APScheduler Background Task Scheduler`  [EXTRACTED]
  docs/superpowers/plans/2026-06-15-rss-reader-pro-implementation.md → backend/requirements.txt
- `Frontend API Client (Axios with typed endpoints)` --conceptually_related_to--> `httpx Async HTTP Client`  [INFERRED]
  docs/superpowers/plans/2026-06-15-rss-reader-pro-implementation.md → backend/requirements.txt
- `test_list_articles_with_data()` --calls--> `get_connection()`  [INFERRED]
  backend/tests/test_articles.py → backend/app/database.py

## Import Cycles
- 1-file cycle: `backend/app/main.py -> backend/app/main.py`

## Hyperedges (group relationships)
- **RSS Reader Pro System** — specs_2026_06_15_rss_reader_pro_design, plans_2026_06_15_rss_reader_pro_implementation, backend_database_schema, backend_pydantic_models, backend_fetcher_service, backend_parser_service, backend_scheduler_service, backend_categories_api, backend_feeds_api, backend_articles_api, backend_opml_api, backend_stats_api, backend_test_suite, backend_docker_setup, frontend_api_client, frontend_zustand_stores, frontend_react_components, frontend_pages, frontend_test_suite, frontend_docker_setup, docker_compose, backend_requirements, frontend_index [EXTRACTED 1.00]
- **Backend Service Layer** — backend_fetcher_service, backend_parser_service, backend_scheduler_service [EXTRACTED 1.00]
- **Backend API Layer** — backend_categories_api, backend_feeds_api, backend_articles_api, backend_opml_api, backend_stats_api [EXTRACTED 1.00]
- **Frontend Application Layer** — frontend_api_client, frontend_zustand_stores, frontend_react_components, frontend_pages [EXTRACTED 1.00]

## Communities (20 total, 0 thin omitted)

### Community 0 - "Backend Core & Database"
Cohesion: 0.07
Nodes (33): Settings, get_connection(), get_db_path(), init_db(), lifespan(), BackgroundTasks, BaseSettings, Connection (+25 more)

### Community 1 - "Frontend API Client"
Cohesion: 0.11
Nodes (18): api, Article, articlesApi, categoriesApi, Feed, feedsApi, opmlApi, PaginatedResponse (+10 more)

### Community 2 - "Backend API Routers"
Cohesion: 0.12
Nodes (39): APScheduler Background Task Scheduler, Articles Read/Search/Update API Router, Categories CRUD API Router, Database Schema (SQLite Init with WAL + FTS5), Backend Dockerfile (python:3.12-slim + uvicorn), Feeds CRUD + Refresh API Router, Feed Fetcher Service (httpx AsyncClient), OPML Import/Export API Router (+31 more)

### Community 3 - "Frontend UI Layout & Pages"
Cohesion: 0.16
Nodes (13): Category, MainLayout(), Sidebar(), CategoryView(), SettingsPage(), App(), queryClient, CategoryState (+5 more)

### Community 4 - "Data Models & Schemas"
Cohesion: 0.20
Nodes (20): ArticleOut, ArticleUpdate, CategoryCreate, CategoryOut, CategoryUpdate, FeedCreate, FeedOut, FeedSummary (+12 more)

### Community 5 - "Frontend TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleDetection (+10 more)

### Community 6 - "Frontend Dependencies"
Cohesion: 0.11
Nodes (17): dependencies, axios, react, react-dom, react-router-dom, @tanstack/react-query, zustand, name (+9 more)

### Community 7 - "Frontend Dev Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, jsdom, msw, postcss, tailwindcss, @tailwindcss/typography, @testing-library/jest-dom (+7 more)

### Community 8 - "Feed Fetcher & Parser"
Cohesion: 0.20
Nodes (8): fetch_feed(), parse_feed(), ParsedArticle, ParsedFeed, init_scheduler(), refresh_all_feeds(), refresh_feed(), schedule_feed()

## Knowledge Gaps
- **59 isolated node(s):** `Connection`, `UploadFile`, `BackgroundTasks`, `name`, `private` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `Backend Core & Database` to `Feed Fetcher & Parser`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `refresh_feed()` connect `Feed Fetcher & Parser` to `Backend Core & Database`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `get_connection()` (e.g. with `test_list_articles_with_data()` and `test_mark_read()`) actually correct?**
  _`get_connection()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Connection`, `UploadFile`, `BackgroundTasks` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Core & Database` be split into smaller, more focused modules?**
  _Cohesion score 0.07215541165587419 - nodes in this community are weakly interconnected._
- **Should `Frontend API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.10512820512820513 - nodes in this community are weakly interconnected._
- **Should `Backend API Routers` be split into smaller, more focused modules?**
  _Cohesion score 0.11605937921727395 - nodes in this community are weakly interconnected._