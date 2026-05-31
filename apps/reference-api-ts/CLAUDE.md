# reference-api-ts — app instructions

This app follows the GetExp framework doctrine in the **repo-root**
[`CLAUDE.md`](../../CLAUDE.md) — read that first. This file records THIS app's
profile and any per-app overrides.

## Profile

- Template: `api-ts` (Fastify, type: service)
- Role: **canonical reference** — copy these patterns into new TS services.
- Storage: none wired yet (demonstrates the request/error/idempotency baseline;
  use the `Repository` / `BlobStore` ports when adding persistence).

## Working on this app

- Import building blocks from `@getexp/core`; never re-implement them.
- Keep this app exemplary: it is what other services are modeled on.
- Keep the gates green (`pnpm check`).

## Overrides (strict + per-app)

The frozen stack applies by default. To deviate **for this app only**, add a
line below with a one-line justification.

- _(none)_
