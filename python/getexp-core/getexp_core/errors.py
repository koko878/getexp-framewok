"""Typed error hierarchy with RFC 7807 "Problem Details" output.

Mirrors ``@getexp/core``'s errors so APIs in either language expose the same
stable, documented error contract.
"""

from __future__ import annotations

from typing import Any, TypedDict


class ProblemDetails(TypedDict, total=False):
    type: str
    title: str
    status: int
    detail: str
    instance: str
    details: dict[str, Any]


class AppError(Exception):
    """Base for all expected application errors."""

    code: str = "app_error"
    http_status: int = 500
    is_public: bool = True

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        cause: BaseException | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        self.__cause__ = cause

    def to_problem_details(self, instance: str | None = None) -> ProblemDetails:
        pd: ProblemDetails = {
            "type": self.code,
            "title": type(self).__name__,
            "status": self.http_status,
            "detail": self.message if self.is_public else "An unexpected error occurred.",
        }
        if instance:
            pd["instance"] = instance
        if self.is_public and self.details:
            pd["details"] = self.details
        return pd


class ValidationError(AppError):
    code = "validation_error"
    http_status = 400


class UnauthorizedError(AppError):
    code = "unauthorized"
    http_status = 401


class ForbiddenError(AppError):
    code = "forbidden"
    http_status = 403


class NotFoundError(AppError):
    code = "not_found"
    http_status = 404


class ConflictError(AppError):
    code = "conflict"
    http_status = 409


class RateLimitedError(AppError):
    code = "rate_limited"
    http_status = 429


class InternalError(AppError):
    code = "internal_error"
    http_status = 500
    is_public = False


class ServiceUnavailableError(AppError):
    """A dependency or required configuration is unavailable; the caller may retry."""

    code = "service_unavailable"
    http_status = 503


def to_app_error(exc: object) -> AppError:
    """Normalize any value into an AppError."""
    if isinstance(exc, AppError):
        return exc
    cause = exc if isinstance(exc, BaseException) else None
    return InternalError(str(exc), cause=cause)
