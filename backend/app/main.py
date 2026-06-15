import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers.articles import router as articles_router
from app.routers.categories import router as categories_router
from app.routers.feeds import router as feeds_router
from app.routers.opml import router as opml_router
from app.routers.stats import router as stats_router
from app.services.scheduler import scheduler, init_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(init_db)
    init_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="RSS Reader Pro", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles_router)
app.include_router(categories_router)
app.include_router(feeds_router)
app.include_router(opml_router)
app.include_router(stats_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
