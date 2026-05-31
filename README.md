# GetExp Framework

An opinionated development framework — a **Golden Path** for building APIs, web
and mobile apps fast, on a stack of patterns and building blocks that already
work. Inspired by how Spotify, Netflix, Uber, Stripe and Google run software
(see [`docs/upstream-oss.md`](docs/upstream-oss.md)).

> **New here? Read [`CLAUDE.md`](CLAUDE.md) first** — it is the doctrine every
> app in this repo follows.

## Why

Stop re-answering the same foundational questions (web framework, logging,
errors, config, retries, CI) for every project. Answer them **once**, with
tested code, so each new app starts at "build the feature".

## What's inside

| Area | Location |
| --- | --- |
| Doctrine | [`CLAUDE.md`](CLAUDE.md), [`docs/golden-path.md`](docs/golden-path.md) |
| Docs hub | [`docs/README.md`](docs/README.md) |
| High-level design | [`docs/high-level-design.md`](docs/high-level-design.md) |
| Usage reference | [`docs/reference.md`](docs/reference.md) |
| Shared building blocks (TS) | [`packages/core`](packages/core) — `@getexp/core` |
| Shared building blocks (Python) | [`python/getexp-core`](python/getexp-core) — `getexp_core` |
| Reference apps | [`apps/reference-api-ts`](apps/reference-api-ts) (Fastify), [`apps/reference-api-py`](apps/reference-api-py) (FastAPI) |
| Scaffolding | [`tools/create-app.mjs`](tools/create-app.mjs) + [`templates/`](templates) |
| Decisions | [`docs/adr/`](docs/adr) |
| Paved-road CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

Both core libraries ship the same battle-tested primitives: `Result`, a typed
error hierarchy with RFC 7807 Problem Details, structured logging with a
correlation id, fail-fast config validation, a resilient HTTP client
(timeout + retry/backoff + circuit breaker), and idempotency-key support.

## Quick start

```bash
# TypeScript
pnpm install
pnpm check                                  # Biome + tsc + Vitest
pnpm --filter reference-api-ts start        # http://localhost:8000/health

# Python
uv sync --all-packages
uv run pytest
uv run uvicorn app.main:app --app-dir apps/reference-api-py

# Scaffold a new app
pnpm create-app --template api-ts --name billing-api
#   templates: api-ts | api-py | web | mobile
```

## Status

This is a functional skeleton: the doctrine, both shared cores (fully tested),
two runnable reference services, the scaffolding CLI with four templates, and
CI gates. Extend it by adding capabilities **to the core packages, with tests**,
so every future app inherits them. Changing a frozen choice needs an ADR.
