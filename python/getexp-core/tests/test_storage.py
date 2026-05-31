from dataclasses import dataclass

import pytest
from getexp_core.errors import NotFoundError
from getexp_core.storage import (
    HealthCheck,
    InMemoryBlobStore,
    InMemoryRepository,
    PresignOptions,
    check_health,
)


@dataclass
class User:
    id: str
    name: str


async def test_repository_crud() -> None:
    repo: InMemoryRepository[User, str] = InMemoryRepository(lambda u: u.id)
    await repo.create(User(id="1", name="Ada"))

    got = await repo.get("1")
    assert got is not None and got.name == "Ada"
    assert len(await repo.list()) == 1

    updated = await repo.update("1", {"name": "Grace"})
    assert updated.name == "Grace"

    await repo.delete("1")
    assert await repo.get("1") is None


async def test_repository_update_missing_raises() -> None:
    repo: InMemoryRepository[User, str] = InMemoryRepository(lambda u: u.id)
    with pytest.raises(NotFoundError):
        await repo.update("nope", {"name": "x"})


async def test_blob_store_round_trip() -> None:
    store = InMemoryBlobStore()
    await store.put("greeting.txt", b"hello")
    assert await store.exists("greeting.txt")
    assert await store.get("greeting.txt") == b"hello"

    await store.delete("greeting.txt")
    assert not await store.exists("greeting.txt")


async def test_blob_store_missing_and_presign() -> None:
    store = InMemoryBlobStore()
    with pytest.raises(NotFoundError):
        await store.get("absent")
    url = await store.presigned_url("k", PresignOptions(expires_in_seconds=60))
    assert "expires=60" in url


async def test_check_health_aggregates() -> None:
    class Ok:
        name = "db"

        async def ping(self) -> bool:
            return True

    class Bad:
        name = "blob"

        async def ping(self) -> bool:
            raise RuntimeError("unreachable")

    checks: list[HealthCheck] = [Ok(), Bad()]
    report = await check_health(checks)
    assert report.healthy is False
    assert report.checks == {"db": True, "blob": False}
