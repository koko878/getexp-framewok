"""Idempotency-key support (the Stripe pattern).

Lets clients safely retry mutating requests. The in-memory store is for
single-instance/dev use; back it with Redis in production via the same Protocol.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class StoredResponse:
    status: int
    body: Any


class IdempotencyStore(Protocol):
    async def get(self, key: str) -> StoredResponse | None: ...
    async def set(self, key: str, value: StoredResponse, ttl_s: float) -> None: ...


class InMemoryIdempotencyStore:
    def __init__(self) -> None:
        self._entries: dict[str, tuple[StoredResponse, float]] = {}

    async def get(self, key: str) -> StoredResponse | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._entries[key]
            return None
        return value

    async def set(self, key: str, value: StoredResponse, ttl_s: float) -> None:
        self._entries[key] = (value, time.monotonic() + ttl_s)


async def with_idempotency(
    store: IdempotencyStore,
    key: str | None,
    operation: Callable[[], Awaitable[StoredResponse]],
    *,
    ttl_s: float = 24 * 60 * 60,
) -> StoredResponse:
    """Run ``operation`` at most once per ``key``; return the cached response on repeats."""
    if not key:
        return await operation()

    cached = await store.get(key)
    if cached is not None:
        return cached

    result = await operation()
    await store.set(key, result, ttl_s)
    return result
