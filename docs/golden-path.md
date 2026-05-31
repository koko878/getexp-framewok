# The Golden Path

The Golden Path (Spotify's term; Netflix calls it the "Paved Road") is the
**supported, opinionated, well-trodden way** to build and run software here.
You *can* step off it, but then you own the consequences. Stay on it and
everything — scaffolding, logging, errors, CI, observability — already works.

## Why a framework at all?

Every new app re-answers the same boring questions: which web framework? how do
we log? how do we handle errors? config? retries? tests? CI? Answering them
fresh each time is where bugs and wasted days live. The framework answers them
**once**, with code that is already tested, so each new app starts at "build the
feature" instead of "rebuild the foundation".

For an AI assistant (Claude) building these apps, this is decisive: a small,
fixed, well-tested surface area means far less to get wrong and far less to
debug.

## The layers

1. **Frozen stack** — one blessed choice per concern (`CLAUDE.md`).
2. **Building blocks** — `@getexp/core` (TS) and `getexp_core` (Python): result,
   typed errors, structured logger, config loader, resilient HTTP client,
   idempotency. Tested, mirrored across both languages.
3. **Reference apps** — `apps/reference-api-ts` and `apps/reference-api-py`:
   working services that demonstrate every pattern. Copy them.
4. **Scaffolding** — `pnpm create-app` generates a new app with the conventions
   already wired (Spotify Backstage "Software Templates" model).
5. **Paved road / guardrails** — Biome, Ruff, strict type checking, tests, and
   CI that blocks merges off the path.

## What "good" looks like for a new service

- Config validated at boot; the process refuses to start misconfigured.
- Every log line is JSON with a `x-request-id`.
- Every error returns `application/problem+json` with a stable `type` code.
- Outbound calls go through the resilient `HttpClient`.
- `/health` and `/ready` exist.
- `pnpm check` (or `uv run pytest` + `ruff` + `mypy`) is green.

## Extending the framework

Found a gap? Add the capability **to the core package, with tests**, then use
it — so the next app inherits it for free. Changing a frozen choice requires an
ADR (`docs/adr/`). The framework grows deliberately, not by drift.

See `docs/upstream-oss.md` for the industry lineage of these choices.
