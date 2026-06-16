from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/rss.db"
    log_level: str = "INFO"
    default_refresh_interval: int = 30
    fulltext_rss_url: str = "http://fullfeedrss/extract.php"
    secure_cookies: bool = False
    cors_origins: str = "http://localhost:80,http://localhost:5173,http://localhost:8383,http://127.0.0.1:80,http://127.0.0.1:5173,http://127.0.0.1:8383"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
