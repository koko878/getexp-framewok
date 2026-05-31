import httpx
import pytest
from app.main import app


@pytest.fixture
async def client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_health(client: httpx.AsyncClient) -> None:
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
    assert "x-request-id" in res.headers


async def test_greeting_validation_returns_problem_details(client: httpx.AsyncClient) -> None:
    res = await client.post("/greetings", json={"name": "   "})
    assert res.status_code == 400
    body = res.json()
    assert body["type"] == "validation_error"
    assert body["status"] == 400


async def test_greeting_is_idempotent(client: httpx.AsyncClient) -> None:
    headers = {"Idempotency-Key": "abc-123"}
    first = await client.post("/greetings", json={"name": "Ada"}, headers=headers)
    second = await client.post("/greetings", json={"name": "Grace"}, headers=headers)
    assert first.status_code == 201
    # Same key -> cached first result, ignores the new body.
    assert second.json() == first.json()
    assert second.json() == {"message": "Hello, Ada!"}
