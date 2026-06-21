from os import environ


class Settings:
    database_url: str = environ.get("DATABASE_URL", "sqlite:///./data/rss.db")
    log_level: str = environ.get("LOG_LEVEL", "INFO")
    default_refresh_interval: int = int(environ.get("DEFAULT_REFRESH_INTERVAL", "30"))
    fulltext_rss_url: str = environ.get("FULLTEXT_RSS_URL", "http://fullfeedrss/extract.php")
    secure_cookies: bool = environ.get("SECURE_COOKIES", "False").lower() == "true"
    cors_origins: str = environ.get("CORS_ORIGINS", "http://localhost:80,http://localhost:5173,http://localhost:8383,http://127.0.0.1:80,http://127.0.0.1:5173,http://127.0.0.1:8383")


settings = Settings()
