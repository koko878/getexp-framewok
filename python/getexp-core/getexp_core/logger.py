"""Structured logging built on structlog.

JSON to stdout in production (machine-ingestible), pretty console in dev. Bind
a request/correlation id so every line is traceable — the same baseline the
TypeScript core ships with.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import structlog

_configured = False


def configure_logging(*, level: str | None = None, pretty: bool | None = None) -> None:
    """Configure process-wide logging. Idempotent; safe to call at startup."""
    global _configured
    is_prod = os.environ.get("PYTHON_ENV") == "production"
    use_pretty = (not is_prod) if pretty is None else pretty
    log_level = (level or os.environ.get("LOG_LEVEL") or ("info" if is_prod else "debug")).upper()

    renderer: structlog.types.Processor = (
        structlog.dev.ConsoleRenderer() if use_pretty else structlog.processors.JSONRenderer()
    )

    min_level = getattr(logging, log_level, logging.INFO)
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(min_level),
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        cache_logger_on_first_use=True,
    )
    _configured = True


def get_logger(**initial_values: Any) -> structlog.stdlib.BoundLogger:
    if not _configured:
        configure_logging()
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(**initial_values)
    return logger


def with_request_id(request_id: str, **extra: Any) -> None:
    """Bind a request id to the context so all subsequent logs carry it."""
    structlog.contextvars.bind_contextvars(request_id=request_id, **extra)
