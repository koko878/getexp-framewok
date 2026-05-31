"""Result type — explicit success/failure without raising.

Mirrors ``@getexp/core``'s Result. Prefer it for expected/recoverable
outcomes; reserve exceptions for truly exceptional cases.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
U = TypeVar("U")
E = TypeVar("E")


@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    value: T

    @property
    def ok(self) -> bool:
        return True


@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    error: E

    @property
    def ok(self) -> bool:
        return False


Result = Ok[T] | Err[E]


def ok(value: T) -> Ok[T]:
    return Ok(value)


def err(error: E) -> Err[E]:
    return Err(error)


def is_ok(r: Result[T, E]) -> bool:
    return isinstance(r, Ok)


def is_err(r: Result[T, E]) -> bool:
    return isinstance(r, Err)


def unwrap(r: Result[T, E]) -> T:
    """Return the value or raise the error. Use at boundaries only."""
    if isinstance(r, Ok):
        return r.value
    raise r.error if isinstance(r.error, BaseException) else RuntimeError(str(r.error))


def unwrap_or(r: Result[T, E], fallback: T) -> T:
    return r.value if isinstance(r, Ok) else fallback


def map_ok(r: Result[T, E], fn: Callable[[T], U]) -> Result[U, E]:
    return ok(fn(r.value)) if isinstance(r, Ok) else r


def from_callable(fn: Callable[[], T]) -> Result[T, Exception]:
    try:
        return ok(fn())
    except Exception as exc:
        return err(exc)


async def from_awaitable(awaitable: Awaitable[T]) -> Result[T, Exception]:
    try:
        return ok(await awaitable)
    except Exception as exc:
        return err(exc)
