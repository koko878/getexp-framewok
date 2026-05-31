# ADR 0001 — Frozen stack choices

- Status: Accepted
- Date: 2026-05-31

## Context

The framework's value comes from removing per-project choice. We need one
blessed option per concern, across a TypeScript and a Python ecosystem, that
together cover API/backend, full-stack web and mobile.

## Decision

| Concern | TS | Python | Why |
| --- | --- | --- | --- |
| API | Fastify 5 | FastAPI | Schema-first, fast, great DX, first-class async |
| Web | Next.js | — | De-facto React full-stack standard |
| Mobile | Expo | — | Fastest path to RN apps; shares TS + Zod |
| Validation | Zod | Pydantic v2 | Same "parse, don't validate" philosophy both sides |
| Tests | Vitest | pytest | Fast, ergonomic, ubiquitous |
| Lint+format | Biome | Ruff | Single fast tool replacing ESLint+Prettier / Flake8+Black+isort |
| Types | tsc strict | mypy strict | Catch errors before runtime |
| Logging | Pino | structlog | Structured JSON, low overhead |

Versions are pinned in the manifests. We deliberately stayed on TypeScript
5.9.x rather than auto-adopting 6.0 to keep the foundation on a version we have
fully validated; a 6.x upgrade will get its own ADR.

## Consequences

- New apps have zero stack debate.
- Shared building blocks only need to support these tools.
- Adopting an alternative for any concern requires a superseding ADR.
