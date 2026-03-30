from __future__ import annotations
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:talents_dev_pw@localhost:5432/talents_ais"
    SECRET_KEY: str = "change-me-to-a-random-64-char-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Talents Apartments AIS"
    CORS_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if v == "change-me-to-a-random-64-char-string":
            import warnings
            warnings.warn("SECRET_KEY is using the default placeholder — set a real secret in .env", stacklevel=2)
        return v

    @field_validator("CORS_ORIGINS")
    @classmethod
    def strip_cors_origins(cls, v: str) -> str:
        return ",".join(o.strip() for o in v.split(",") if o.strip())


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
