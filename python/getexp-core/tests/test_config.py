import pytest
from getexp_core.config import ConfigError, load_config
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="")
    node_env: str = "development"
    port: int


def test_parses_valid_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setenv("PORT", "8080")
    cfg = load_config(Settings)
    assert cfg.port == 8080
    assert cfg.node_env == "production"


def test_fails_fast_on_invalid(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PORT", "not-a-number")
    with pytest.raises(ConfigError):
        load_config(Settings)
