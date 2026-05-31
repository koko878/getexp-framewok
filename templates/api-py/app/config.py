from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "__APP_NAME__"
    python_env: str = "development"
    log_level: str = "info"
    port: int = 8000
