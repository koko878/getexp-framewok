"""Storage ports (hexagonal / ports & adapters).

App code depends on these protocols, never on a database driver or cloud SDK
directly. Concrete adapters (Postgres, S3, Azure Blob, ...) live in separate
optional packages and are selected at boot by configuration (a connection URL).
That is what makes storage plug-and-play across infra: swapping a vendor is a
config change, not a code change.

This module ships the contracts plus in-memory adapters for tests and
single-instance/dev use. Mirrors ``@getexp/core``'s storage module. See
docs/adr/0004-storage-ports-and-adapters.md.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Generic, Protocol, TypeVar
from urllib.parse import quote

from getexp_core.errors import NotFoundError

T = TypeVar("T")
Id = TypeVar("Id")
# Id appears only in parameter (input) positions on the protocol, so it must be
# declared contravariant; the concrete InMemoryRepository uses an invariant Id.
IdContra = TypeVar("IdContra", contravariant=True)

# ---------------------------------------------------------------------------
# Repository — the common-case CRUD contract over a collection of entities.
# ---------------------------------------------------------------------------


class Repository(Protocol[T, IdContra]):
    async def get(self, id: IdContra) -> T | None: ...
    async def list(self) -> list[T]: ...
    async def create(self, entity: T) -> T: ...
    async def update(self, id: IdContra, patch: dict[str, object]) -> T: ...
    async def delete(self, id: IdContra) -> None: ...


class InMemoryRepository(Generic[T, Id]):
    """In-memory Repository for tests/dev. ``id_of`` extracts an entity's id."""

    def __init__(self, id_of: Callable[[T], Id]) -> None:
        self._id_of = id_of
        self._items: dict[Id, T] = {}

    async def get(self, id: Id) -> T | None:
        return self._items.get(id)

    async def list(self) -> list[T]:
        return list(self._items.values())

    async def create(self, entity: T) -> T:
        self._items[self._id_of(entity)] = entity
        return entity

    async def update(self, id: Id, patch: dict[str, object]) -> T:
        existing = self._items.get(id)
        if existing is None:
            raise NotFoundError(f"Entity {id} not found")
        for key, value in patch.items():
            setattr(existing, key, value)
        return existing

    async def delete(self, id: Id) -> None:
        self._items.pop(id, None)


# ---------------------------------------------------------------------------
# BlobStore — object/blob storage behind one contract. Adapters: S3-compatible
# (AWS S3 / GCS interop / Cloudflare R2 / MinIO) and Azure Blob Storage.
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class PutOptions:
    content_type: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PresignOptions:
    expires_in_seconds: int = 3600
    operation: str = "get"


class BlobStore(Protocol):
    async def put(self, key: str, data: bytes, options: PutOptions | None = None) -> None: ...
    async def get(self, key: str) -> bytes: ...
    async def exists(self, key: str) -> bool: ...
    async def delete(self, key: str) -> None: ...
    async def presigned_url(self, key: str, options: PresignOptions | None = None) -> str: ...


class InMemoryBlobStore:
    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    async def put(self, key: str, data: bytes, options: PutOptions | None = None) -> None:
        self._blobs[key] = data

    async def get(self, key: str) -> bytes:
        blob = self._blobs.get(key)
        if blob is None:
            raise NotFoundError(f"Blob {key} not found")
        return blob

    async def exists(self, key: str) -> bool:
        return key in self._blobs

    async def delete(self, key: str) -> None:
        self._blobs.pop(key, None)

    async def presigned_url(self, key: str, options: PresignOptions | None = None) -> str:
        opts = options or PresignOptions()
        return f"memory://blob/{quote(key)}?op={opts.operation}&expires={opts.expires_in_seconds}"


# ---------------------------------------------------------------------------
# HealthCheck — storage adapters report readiness so /ready reflects reality.
# ---------------------------------------------------------------------------


class HealthCheck(Protocol):
    name: str

    async def ping(self) -> bool: ...


@dataclass(frozen=True, slots=True)
class HealthReport:
    healthy: bool
    checks: dict[str, bool]


async def check_health(checks: list[HealthCheck]) -> HealthReport:
    """Ping every dependency; a failed ping (or raise) marks it unhealthy."""
    results: dict[str, bool] = {}
    for check in checks:
        try:
            results[check.name] = await check.ping()
        except Exception:
            results[check.name] = False
    return HealthReport(healthy=all(results.values()), checks=results)
