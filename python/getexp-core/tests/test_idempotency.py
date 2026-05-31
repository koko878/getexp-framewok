import asyncio

from getexp_core.idempotency import (
    InMemoryIdempotencyStore,
    StoredResponse,
    with_idempotency,
)


async def test_runs_once_per_key() -> None:
    store = InMemoryIdempotencyStore()
    calls = {"n": 0}

    async def op() -> StoredResponse:
        calls["n"] += 1
        return StoredResponse(status=201, body={"id": 1})

    first = await with_idempotency(store, "key-1", op)
    second = await with_idempotency(store, "key-1", op)
    assert first == StoredResponse(status=201, body={"id": 1})
    assert second == first
    assert calls["n"] == 1


async def test_always_runs_without_key() -> None:
    store = InMemoryIdempotencyStore()
    calls = {"n": 0}

    async def op() -> StoredResponse:
        calls["n"] += 1
        return StoredResponse(status=200, body={})

    await with_idempotency(store, None, op)
    await with_idempotency(store, None, op)
    assert calls["n"] == 2


async def test_entries_expire() -> None:
    store = InMemoryIdempotencyStore()
    await store.set("k", StoredResponse(status=200, body="old"), ttl_s=0.005)
    await asyncio.sleep(0.015)
    assert await store.get("k") is None
