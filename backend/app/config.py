from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/rss.db"
    log_level: str = "INFO"
    default_refresh_interval: int = 30
    fulltext_rss_url: str = "http://fullfeedrss/extract.php"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
