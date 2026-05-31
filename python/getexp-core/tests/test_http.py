import httpx
import pytest
from getexp_core.http import (
    CircuitBreakerOptions,
    CircuitOpenError,
    HttpClient,
    HttpClientOptions,
    RetryOptions,
)


def _client_with(handler: object, options: HttpClientOptions) -> HttpClient:
    transport = httpx.MockTransport(handler)  # type: ignore[arg-type]
    async_client = httpx.AsyncClient(transport=transport, base_url="https://api.test")
    return HttpClient(options, client=async_client)


async def test_retries_then_succeeds() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(503)
        return httpx.Response(200, json={"ok": True})

    client = _client_with(
        handler,
        HttpClientOptions(retry=RetryOptions(attempts=3, base_delay_s=0.001, max_delay_s=0.001)),
    )
    body = await client.json("GET", "/x")
    assert body == {"ok": True}
    assert calls["n"] == 2
    await client.aclose()


async def test_circuit_opens_after_failures() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = _client_with(
        handler,
        HttpClientOptions(
            retry=RetryOptions(attempts=1, base_delay_s=0.001, max_delay_s=0.001),
            circuit_breaker=CircuitBreakerOptions(failure_threshold=2, reset_timeout_s=10.0),
        ),
    )
    with pytest.raises(httpx.HTTPError):
        await client.request("GET", "/x")
    with pytest.raises(httpx.HTTPError):
        await client.request("GET", "/x")
    assert client.circuit_state == "open"

    with pytest.raises(CircuitOpenError):
        await client.request("GET", "/x")
    await client.aclose()
