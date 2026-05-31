"""Resilient async HTTP client built on httpx.

Bundles the three resilience patterns every outbound call should have
(popularized by Netflix's Hystrix): a per-attempt timeout, retries with
exponential backoff + jitter, and a circuit breaker. Mirrors the TypeScript
``HttpClient``.
"""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

_DEFAULT_RETRYABLE = frozenset({408, 429, 500, 502, 503, 504})


class CircuitOpenError(Exception):
    def __init__(self, message: str = "Circuit breaker is open") -> None:
        super().__init__(message)


class _CircuitBreaker:
    def __init__(self, threshold: int, reset_timeout_s: float) -> None:
        self._threshold = threshold
        self._reset_timeout_s = reset_timeout_s
        self._state = "closed"
        self._failures = 0
        self._opened_at = 0.0

    def can_request(self, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        if self._state == "open":
            if now - self._opened_at >= self._reset_timeout_s:
                self._state = "half-open"
                return True
            return False
        return True

    def on_success(self) -> None:
        self._failures = 0
        self._state = "closed"

    def on_failure(self, now: float | None = None) -> None:
        now = time.monotonic() if now is None else now
        self._failures += 1
        if self._state == "half-open" or self._failures >= self._threshold:
            self._state = "open"
            self._opened_at = now

    @property
    def state(self) -> str:
        return self._state


@dataclass
class RetryOptions:
    attempts: int = 3
    base_delay_s: float = 0.1
    max_delay_s: float = 2.0
    retryable_statuses: frozenset[int] = _DEFAULT_RETRYABLE


@dataclass
class CircuitBreakerOptions:
    failure_threshold: int = 5
    reset_timeout_s: float = 10.0


@dataclass
class HttpClientOptions:
    base_url: str | None = None
    timeout_s: float = 5.0
    default_headers: dict[str, str] = field(default_factory=dict)
    retry: RetryOptions = field(default_factory=RetryOptions)
    circuit_breaker: CircuitBreakerOptions = field(default_factory=CircuitBreakerOptions)


def _backoff_delay(attempt: int, base: float, maximum: float) -> float:
    exponential: float = min(maximum, base * 2**attempt)
    # Full jitter avoids a thundering herd of synchronized retries.
    return random.random() * exponential


class HttpClient:
    def __init__(
        self,
        options: HttpClientOptions | None = None,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._options = options or HttpClientOptions()
        self._client = client or httpx.AsyncClient(
            base_url=self._options.base_url or "",
            timeout=self._options.timeout_s,
            headers=self._options.default_headers,
        )
        self._breaker = _CircuitBreaker(
            self._options.circuit_breaker.failure_threshold,
            self._options.circuit_breaker.reset_timeout_s,
        )

    @property
    def circuit_state(self) -> str:
        return self._breaker.state

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        if not self._breaker.can_request():
            raise CircuitOpenError()

        retry = self._options.retry
        last_exc: Exception | None = None
        for attempt in range(retry.attempts):
            if attempt > 0:
                delay = _backoff_delay(attempt - 1, retry.base_delay_s, retry.max_delay_s)
                await asyncio.sleep(delay)
            try:
                response = await self._client.request(method, path, **kwargs)
                if response.status_code in retry.retryable_statuses:
                    last_exc = httpx.HTTPStatusError(
                        f"Upstream returned {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                    continue
                self._breaker.on_success()
                return response
            except httpx.HTTPError as exc:
                last_exc = exc

        self._breaker.on_failure()
        raise last_exc if last_exc else httpx.HTTPError("Request failed")

    async def json(self, method: str, path: str, **kwargs: Any) -> Any:
        response = await self.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json()

    async def aclose(self) -> None:
        await self._client.aclose()
