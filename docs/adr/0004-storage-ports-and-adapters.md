# ADR 0004 — Storage: ports & adapters (infra-agnostic)

- Status: Accepted
- Date: 2026-05-31

## Context

Apps need persistence — relational data and object/blob storage — but they must
run unchanged across target infrastructures (AWS, Azure, GCP, on-prem, local).
If app code imports a cloud SDK or a specific driver directly, the app is welded
to that vendor and "plug and play across infra" is lost.

## Decision

Storage follows **ports & adapters (hexagonal architecture)**:

1. **The core defines ports** (interfaces), never implementations:
   `Repository<T, Id>`, `BlobStore`, and a `HealthCheck` contract — mirrored in
   `@getexp/core` and `getexp_core`. In-memory adapters ship with the core for
   tests and dev.
2. **Vendor adapters are separate, optional packages** (e.g.
   `@getexp/store-postgres`, `getexp_store_s3`, `getexp_store_azure_blob`). An
   app installs only the adapters it uses, so no app drags in every driver.
3. **Adapter selection is configuration, at boot** — driven by a connection URL
   whose scheme picks the adapter. Swapping infra is a config change.
4. **We standardize on portable protocols, not proprietary APIs**, so one
   adapter spans many providers.

### Connection URLs → adapter

| Concern | URL scheme | Spans (same adapter) |
| --- | --- | --- |
| Relational | `postgres://…` | AWS RDS/Aurora, **Azure Database for PostgreSQL**, Cloud SQL, Neon, Supabase, local |
| Relational (tests) | `sqlite://…` | local file / in-memory |
| Object — S3 API | `s3://bucket/…` (+ endpoint) | AWS S3, Cloudflare R2, MinIO, GCS (interop) |
| Object — Azure | `azblob://container/…` | **Azure Blob Storage** / Azurite (local) |

`BlobStore` is one port with two adapter families (S3-compatible **and** Azure
Blob) because their wire APIs differ; the app code is identical either way.

### Blessed implementations

| Concern | TypeScript | Python |
| --- | --- | --- |
| Relational + migrations | **Drizzle** (drizzle-kit migrations) | **SQLAlchemy 2.0 (async)** + **Alembic** |
| Object — S3 | `@aws-sdk/client-s3` | `aioboto3` |
| Object — Azure | `@azure/storage-blob` | `azure-storage-blob` (aio) |

The ORM is the blessed *tool* for relational access; `Repository` keeps the
common CRUD case portable and testable. Complex queries may use the ORM/query
builder directly — we do not hide SQL behind a lowest-common-denominator layer.

### Lifecycle & operations

- Pools/clients are created once at boot (composition root) and closed on
  shutdown.
- Every storage adapter implements `HealthCheck`; `/ready` aggregates them via
  `checkHealth`, so a service is "ready" only when its storage answers.
- Migrations are first-class and run as a deploy step, never implicitly at boot.
- The `InMemoryIdempotencyStore` already proves the pattern; a Redis-backed
  store would be just another adapter behind the same interface.

## Consequences

- Apps are portable: same image on AWS, Azure, GCP, on-prem, or laptop.
- Tests run with in-memory adapters — no containers required in CI.
- Adding a provider = a new adapter package; app code is untouched.
- The trade-off we accept: ports cover the common case, not every
  vendor-specific feature. Escaping to the raw driver is allowed but explicit.

## Status of this ADR

Design accepted; the **ports and in-memory adapters are implemented** in both
cores (`storage` module). Vendor adapter packages are on the roadmap
(see `docs/high-level-design.md` §11).
