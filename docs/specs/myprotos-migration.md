# Migration brief — recover `myprotos` onto the GetExp framework

> Handoff note. Pick this up from a session that has access to **both**
> `koko878/getexp-framewok` (this repo) and `koko878/myprotos`.

## Source

- Repo: `koko878/myprotos`
- Branch: `claude/tech-consulting-marketplace-EfEwV`
- Nature: a tech-consulting **marketplace** app (built in a previous session).
- Stack: **unknown** — detect it from the source (`package.json` / `pyproject.toml`,
  framework imports, folder layout).

## Goal

Bring the app into this monorepo under `apps/<name>` and refactor it onto the
framework so it follows the doctrine in the repo-root `CLAUDE.md`.

## Steps (the getexp-app-builder agent can run these)

1. **Inspect** the source repo: detect language/framework, list features,
   entities/data model, endpoints and/or screens, current storage.
2. **Choose target template(s)** with `create-app`:
   - HTTP/back-end → `api-ts` or `api-py`
   - React/Next front or full-stack → `web`
   - (a marketplace likely needs an API + a web front)
3. **Port the logic** into the scaffolded app(s), replacing home-grown plumbing
   with `@getexp/core` / `getexp_core`:
   - logging → `createLogger` / `configure_logging` (+ request id)
   - errors → `AppError` family → RFC 7807 Problem Details
   - config → `loadConfig` (Zod) / `load_config` (Pydantic), validated at boot
   - outbound HTTP → the resilient `HttpClient`
   - persistence → the `Repository` / `BlobStore` **ports** (in-memory adapter
     first; real Postgres/S3/Azure via env at the production stage)
   - mutations → idempotency where relevant
4. **Record choices** in `apps/<name>/CLAUDE.md` (overrides with justification
   if the old app needs anything off the frozen stack).
5. **Gates green**: `pnpm check` (TS) and/or `uv run pytest && ruff && mypy`.
6. **Report**: what moved, what changed, what is a stub, how to run it.

## Kick-off prompt (paste in the two-repo session)

> "Read docs/specs/myprotos-migration.md and use getexp-app-builder to migrate
> `koko878/myprotos` (branch claude/tech-consulting-marketplace-EfEwV) into this
> monorepo as a PROTOTYPE."

## Strategy

Prefer **scaffold-then-port** (clean framework app, move logic in) over a raw
copy, so the result is on the paved road rather than a foreign codebase dropped
into `apps/`.

---

## Status

- ✅ **Backend API** — done: `apps/marketplace-api` (Fastify) ports the Express
  backend onto `@getexp/core` (validated config, Problem Details incl. 503,
  structured logs, request id). Agentic Claude loop ported in `src/agent.ts`
  (Anthropic SDK — see app Overrides). 5 tests, runs live. Added
  `ServiceUnavailableError` (503) to both cores.
- ⬜ **Mobile app** — Expo onto the `mobile` template (cadrage → liste → détail).
- ⬜ **Data layer** — Supabase behind the `Repository` port (+ BlobStore for files).
