from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, field_validator


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str
    feed_count: int = 0
    created_at: str


class FeedCreate(BaseModel):
    url: str
    category_id: Optional[int] = None


class FeedUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    category_id: Optional[int] = None
    refresh_interval: Optional[int] = None
    enabled: Optional[bool] = None


class FeedOut(BaseModel):
    id: int
    title: str
    url: str
    site_url: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category_id: Optional[int] = None
    enabled: bool
    refresh_interval: int
    error_count: int
    last_fetched_at: Optional[str] = None
    created_at: str


class FeedSummary(BaseModel):
    id: int
    title: str
    icon_url: Optional[str] = None


class ArticleUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_saved: Optional[bool] = None
    is_starred: Optional[bool] = None


class ArticleOut(BaseModel):
    id: int
    feed_id: int
    guid: str
    title: str
    url: Optional[str] = None
    author: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    published_at: Optional[str] = None
    is_read: bool
    is_saved: bool
    is_starred: bool
    created_at: str
    feed: Optional[FeedSummary] = None


class SearchQuery(BaseModel):
    query: str
    page: int = 1
    per_page: int = 50
    feed_id: Optional[int] = None
    category_id: Optional[int] = None
    unread: Optional[bool] = None
    saved: Optional[bool] = None


class StatsOut(BaseModel):
    total_feeds: int
    total_categories: int
    unread_count: int
    read_today: int
    saved_count: int
    starred_count: int


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool


class RegisterBody(BaseModel):
    username: str
    password: str
    invite_token: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginBody(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    ok: bool
    user: UserOut


class InviteTokenOut(BaseModel):
    token: str
    used: bool
    created_at: str


class CreateInviteResponse(BaseModel):
    token: str
    url: str
