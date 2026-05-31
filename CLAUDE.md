# GetExp Framework — Doctrine (read this first)

This repository is an **opinionated development framework** ("Golden Path").
Its purpose: every new application is built from the **same blessed stack,
patterns and building blocks** so we spend time on product, not on plumbing or
debugging foundations that already work.

> **Claude: when building any app in this repo, you MUST follow this doctrine.**
> Use the frozen stack below and the `@getexp/core` / `getexp_core` building
> blocks. Do not introduce an alternative library for a concern the framework
> already covers without an ADR (`docs/adr/`) justifying it.

## The three rules

1. **Stay on the paved road.** One blessed choice per concern (below). No
   parallel solutions to the same problem.
2. **Reuse the building blocks.** Logging, errors, config, resilient HTTP and
   idempotency already exist and are tested. Import them — never re-implement.
3. **Scaffold, don't hand-roll.** New apps are created with `pnpm create-app`
   (see `tools/create-app.mjs`), which wires the conventions in from line one.

## Frozen stack

| Concern | TypeScript | Python |
| --- | --- | --- |
| Runtime | Node 22 LTS | Python 3.11+ |
| Package manager | pnpm (workspaces) | uv (workspaces) |
| API / backend | Fastify 5 | FastAPI |
| Web full-stack | Next.js (App Router) | — |
| Mobile | Expo (React Native) | — |
| Validation / schema | Zod | Pydantic v2 |
| Tests | Vitest | pytest |
| Lint + format | Biome | Ruff |
| Type checking | tsc (strict) | mypy (strict) |
| Logging | Pino (via `@getexp/core`) | structlog (via `getexp_core`) |
| HTTP client | `@getexp/core` HttpClient | `getexp_core` HttpClient |
| Relational DB | Postgres via Drizzle | Postgres via SQLAlchemy 2.0 + Alembic |
| Object storage | S3 API / Azure Blob (behind `BlobStore`) | S3 API / Azure Blob (behind `BlobStore`) |
| Observability | OpenTelemetry | OpenTelemetry |

Versions are **pinned**. Upgrading a core dependency is a deliberate act,
recorded in an ADR — never an incidental `latest`.

## Cross-cutting patterns (the baseline every service ships with)

These are stolen from how Spotify / Netflix / Uber / Stripe / Google run
services (see `docs/upstream-oss.md` for the lineage and the open-source
projects we adopt):

- **Structured logging + correlation id** — JSON to stdout, one `x-request-id`
  threaded through every log line. (`createLogger` / `configure_logging`)
- **Resilient outbound calls** — never raw `fetch`/`httpx`. Use the framework
  `HttpClient`: per-attempt timeout + retry/backoff-with-jitter + circuit
  breaker (Netflix Hystrix pattern).
- **Typed errors + RFC 7807 Problem Details** — stable machine-readable error
  codes and a consistent `application/problem+json` body (Stripe-style API
  contract). (`AppError` family)
- **12-factor config, validated at boot** — `loadConfig` fails fast on a bad
  env instead of crashing mid-traffic.
- **Idempotency keys** — safe retries for mutating endpoints (Stripe pattern).
  (`withIdempotency`)
- **Health & readiness probes** — every service exposes `/health` and `/ready`.
- **Storage via ports & adapters** — depend on the `Repository` / `BlobStore`
  ports, never a driver or cloud SDK directly. The adapter is chosen at boot by
  a connection URL, so apps run unchanged on AWS, Azure, GCP, on-prem or local
  (see `docs/adr/0004-storage-ports-and-adapters.md`).

## Repository layout

```
packages/core/          @getexp/core   — shared TS building blocks (+ tests)
python/getexp-core/     getexp_core    — shared Python building blocks (+ tests)
apps/                   deployable apps (TS or Python)
  reference-api-ts/      ← canonical Fastify service (copy its patterns)
  reference-api-py/      ← canonical FastAPI service (copy its patterns)
templates/              scaffolding templates used by create-app
tools/create-app.mjs    the scaffolding CLI
docs/                   golden path, conventions, ADRs, upstream OSS map
.github/workflows/      CI — the automated paved road (lint, types, tests)
```

## Commands

```bash
# TypeScript
pnpm install
pnpm check                 # biome + typecheck + tests (run before every commit)
pnpm --filter <pkg> test
pnpm create-app            # scaffold a new app

# Python
uv sync --all-packages
uv run pytest
uv run ruff check . && uv run mypy python/getexp-core/getexp_core
```

## When you (Claude) build a new app here

1. Run `pnpm create-app` and pick the template (`api-ts`, `api-py`, `web`,
   `mobile`).
2. Import building blocks from `@getexp/core` / `getexp_core`. If something is
   missing, add it **to the core package with tests**, then use it — so the
   next app benefits too.
3. Model the app on the matching `apps/reference-api-*` service.
4. Keep `pnpm check` (and the Python equivalents) green. CI enforces it.
5. Any deviation from the frozen stack requires a new ADR in `docs/adr/`.

See `docs/golden-path.md` for the full rationale.
