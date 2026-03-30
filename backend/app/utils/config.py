from __future__ import annotations
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:talents_dev_pw@localhost:5432/talents_ais"
    SECRET_KEY: str = "change-me-to-a-random-64-char-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Talents Apartments AIS"
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
