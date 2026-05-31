# Working with Claude Code on this framework

How to actually use GetExp day to day, and how to parametrize your tech choices
so Claude Code respects them — without repeating yourself every session.

## The model: one monorepo, doctrine auto-loaded

- **All your apps live in this repo**, under `apps/`. You don't set anything up
  per project — you scaffold a new app and start building.
- **Claude Code reads `CLAUDE.md` automatically** at the start of every session.
  The root `CLAUDE.md` is the framework doctrine, so Claude is constrained to
  the blessed stack and building blocks without you re-explaining them.
- **Nested `CLAUDE.md` files layer on top.** When Claude works inside
  `apps/billing-api/`, it also reads `apps/billing-api/CLAUDE.md` — that app's
  specific choices and overrides. Root rules + app rules compose.

## First run

```bash
pnpm install            # TypeScript workspace
uv sync --all-packages  # Python workspace
pnpm check              # confirm everything is green
```

## Build a new app

```bash
pnpm create-app --template api-ts --name billing-api
#   --template  api-ts | api-py | web | mobile
#   --storage   postgres,s3   (optional; overrides getexp.json defaults)
```

`create-app` will:
1. generate `apps/billing-api/` from the template;
2. write `apps/billing-api/CLAUDE.md` recording its profile + an overrides
   section;
3. register the app in `getexp.json`.

Then just tell Claude what to build — it already knows the rules:

> "In `apps/billing-api`, add a `POST /invoices` endpoint that validates the
> body, persists via a `Repository`, and returns Problem Details on error."

Claude will use Zod/Pydantic, `@getexp/core`/`getexp_core`, the storage ports,
and keep the gates green — because that is what the CLAUDE.md files mandate.

## The three levels where you set tech choices

```
getexp.json            ← project-wide defaults  (owner, default storage adapters)
apps/<name>/CLAUDE.md  ← per-app choices + overrides (the frozen stack, tuned)
apps/<name>/.env       ← runtime wiring (which DB/bucket, ports, log level)
```

### 1. Project defaults — `getexp.json`

Set the standing preferences `create-app` uses to pre-fill new apps:

```json
{
  "defaults": { "owner": "platform", "storage": { "relational": "postgres", "blob": "s3" } },
  "apps": [ { "name": "billing-api", "template": "api-ts" } ]
}
```

Change `s3` to `azblob` here and every *new* app defaults to Azure Blob.

### 2. Per-app choices & overrides — `apps/<name>/CLAUDE.md`

The frozen stack applies by default. To deviate **for one app**, write it (with
a reason) in that app's overrides section — Claude reads and honors it:

```markdown
## Overrides (strict + per-app)
- Use Drizzle's relational store with SQLite (this app is a single-node edge
  cache, no Postgres needed).
- Blob storage: azblob (this product ships on Azure).
```

Anything not listed must follow the root doctrine. Framework-wide changes go
through an ADR instead.

### 3. Runtime wiring — `apps/<name>/.env`

Storage adapters are selected by connection URL, so the same code runs on any
infra:

```bash
DATABASE_URL=postgres://user:pass@db.internal:5432/billing   # RDS / Azure PG / local
BLOB_URL=s3://invoices?endpoint=https://s3.eu-west-1.amazonaws.com
# BLOB_URL=azblob://invoices                                 # Azure Blob instead
LOG_LEVEL=info
PORT=8000
```

## Useful session prompts

- *"Scaffold a new Python API called `payments-api` and wire a health check that
  pings the database."*
- *"Add a `Repository`-backed CRUD for `Customer` in `apps/billing-api`, with
  tests using the in-memory adapter."*
- *"This app must run on Azure — set its blob override and update `.env`."*
- *"Add a `rate-limiter` building block to the core (both languages) with tests,
  then use it in `apps/billing-api`."*

## When Claude wants to step off the path

If a task needs something the frozen stack doesn't cover, Claude should either
(a) add it to the core with tests, or (b) record a per-app override with a
justification, or (c) propose an ADR for a framework-wide change — never
silently introduce a parallel solution. That is the one rule that keeps every
app plug-and-play.

See also: [`../CLAUDE.md`](../CLAUDE.md) · [`golden-path.md`](golden-path.md) ·
[`reference.md`](reference.md).
