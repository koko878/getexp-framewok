"""12-factor configuration: load from the environment, validate with Pydantic,
fail fast at boot.

Define a ``pydantic_settings.BaseSettings`` subclass and call ``load_config``.
Any missing/malformed value raises ``ConfigError`` with a readable summary
before the service starts taking traffic.
"""

from __future__ import annotations

from typing import TypeVar

from pydantic import ValidationError as PydanticValidationError
from pydantic_settings import BaseSettings

T = TypeVar("T", bound=BaseSettings)


class ConfigError(Exception):
    """Raised when configuration is missing or invalid."""


def load_config(settings_cls: type[T]) -> T:
    try:
        return settings_cls()
    except PydanticValidationError as exc:
        issues = "\n".join(
            f"  - {'.'.join(str(p) for p in e['loc']) or '(root)'}: {e['msg']}"
            for e in exc.errors()
        )
        raise ConfigError(f"Invalid configuration:\n{issues}") from exc
