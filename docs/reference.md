# GetExp Framework — Reference & usage guide

How to use the framework day to day: the building blocks (with copy-paste
examples in both languages), how to scaffold an app, and how to extend the core.

- Rules & stack: [`../CLAUDE.md`](../CLAUDE.md)
- Architecture: [`high-level-design.md`](high-level-design.md)
- Conventions: [`conventions/typescript.md`](conventions/typescript.md) ·
  [`conventions/python.md`](conventions/python.md)

---

## Getting started

```bash
# TypeScript
pnpm install
pnpm check                               # Biome + tsc + Vitest (run before commit)
pnpm --filter reference-api-ts start     # http://localhost:8000

# Python
uv sync --all-packages
uv run pytest
uv run ruff check . && uv run mypy python/getexp-core/getexp_core
uv run uvicorn app.main:app --app-dir apps/reference-api-py
```

Imports:

```ts
import { HttpClient, NotFoundError, ok } from '@getexp/core';      // root
import { withIdempotency } from '@getexp/core/idempotency';        // subpath
```

```python
from getexp_core import HttpClient, NotFoundError, ok
```

---

## Building blocks

### 1. Result — explicit success/failure

Use `Result` for expected/recoverable outcomes; reserve `throw`/`raise` for
truly exceptional cases.

```ts
import { err, isOk, ok, type Result } from '@getexp/core';

function parsePort(raw: string): Result<number, string> {
  const n = Number(raw);
  return Number.isInteger(n) ? ok(n) : err(`not an int: ${raw}`);
}

const r = parsePort('8080');
if (isOk(r)) console.log(r.value); // 8080
```

```python
from getexp_core import Result, err, is_ok, ok

def parse_port(raw: str) -> Result[int, str]:
    return ok(int(raw)) if raw.isdigit() else err(f"not an int: {raw}")

r = parse_port("8080")
if is_ok(r):
    print(r.value)  # 8080
```

Helpers: `unwrap` / `unwrapOr` / `map` (TS) · `unwrap` / `unwrap_or` / `map_ok`
(Py); `fromThrowable` / `fromPromise` (TS) · `from_callable` / `from_awaitable`
(Py) wrap throwing code into a `Result`.

### 2. Errors — typed, with RFC 7807 Problem Details

Throw an `AppError` subclass; the app's error handler renders
`application/problem+json`. Available: `ValidationError` (400),
`UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404),
`ConflictError` (409), `RateLimitedError` (429), `InternalError` (500, message
hidden from clients).

```ts
import { NotFoundError } from '@getexp/core';

if (!user) {
  throw new NotFoundError('User not found', { details: { userId } });
}
// → { "type": "not_found", "title": "NotFoundError", "status": 404,
//     "detail": "User not found", "details": { "userId": "…" } }
```

```python
from getexp_core import NotFoundError

if user is None:
    raise NotFoundError("User not found", details={"user_id": user_id})
```

`toAppError` / `to_app_error` normalizes any thrown value into an `AppError`
(used by the catch-all error handler).

### 3. Logger — structured JSON + correlation id

```ts
import { createLogger, withRequestId } from '@getexp/core';

const log = createLogger({ base: { service: 'billing-api' } });
const reqLog = withRequestId(log, requestId);
reqLog.info({ orderId }, 'order.created');
```

In Fastify, prefer Fastify's own logger built from our shared config, and use
`request.log` inside handlers (it already carries the request id):

```ts
const app = Fastify({ logger: loggerOptions({ base: { service: 'billing-api' } }) });
app.get('/x', async (req) => { req.log.info('handling'); /* … */ });
```

```python
from getexp_core import configure_logging, get_logger, with_request_id

configure_logging(level="info")
log = get_logger(service="billing-api")
with_request_id(request_id)          # binds to context; all later logs carry it
log.info("order.created", order_id=order_id)
```

Sensitive fields (`authorization`, `cookie`, `password`, `token`, `secret`,
`apiKey`) are redacted automatically. Pretty output only in `development`; JSON
everywhere else.

### 4. Config — 12-factor, validated at boot

```ts
import { env, loadConfig } from '@getexp/core';
import { z } from 'zod';

const config = loadConfig(
  z.object({
    NODE_ENV: env.nodeEnv(),
    PORT: env.port().default(8000),
    LOG_LEVEL: env.logLevel().default('info'),
    DATABASE_URL: z.string().url(),
  }),
);
// Throws ConfigError with a readable summary if the env is bad — fail fast.
```

```python
from getexp_core import load_config
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    port: int = 8000
    log_level: str = "info"
    database_url: str

config = load_config(Settings)   # raises ConfigError on a bad env
```

### 5. HttpClient — resilient outbound calls

Never call another service with raw `fetch` / `httpx`. The client adds a
per-attempt timeout, retry with exponential backoff + full jitter, and a circuit
breaker.

```ts
import { CircuitOpenError, HttpClient } from '@getexp/core';

const client = new HttpClient({
  baseUrl: 'https://payments.internal/',
  timeoutMs: 3000,
  retry: { attempts: 3 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 10_000 },
});

try {
  const charge = await client.json<Charge>('charges', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
} catch (e) {
  if (e instanceof CircuitOpenError) {/* dependency is down — degrade */}
}
```

```python
from getexp_core import HttpClient, HttpClientOptions, RetryOptions

client = HttpClient(HttpClientOptions(
    base_url="https://payments.internal",
    timeout_s=3.0,
    retry=RetryOptions(attempts=3),
))
charge = await client.json("POST", "/charges", json=payload)
await client.aclose()
```

Defaults: 3 attempts, 5s timeout, breaker opens after 5 consecutive failures for
10s. Retryable statuses: 408, 429, 500, 502, 503, 504.

### 6. Idempotency — safe retries (Stripe pattern)

```ts
import { InMemoryIdempotencyStore, withIdempotency } from '@getexp/core';

const store = new InMemoryIdempotencyStore(); // swap for Redis in prod

const result = await withIdempotency(store, idempotencyKey, async () => {
  const order = await createOrder(input);     // side effect runs at most once
  return { status: 201, body: order };
});
reply.status(result.status).send(result.body);
```

```python
from getexp_core import InMemoryIdempotencyStore, StoredResponse, with_idempotency

store = InMemoryIdempotencyStore()

async def op() -> StoredResponse:
    order = await create_order(payload)
    return StoredResponse(status=201, body=order)

result = await with_idempotency(store, idempotency_key, op)
```

Same key → cached response, side effect skipped. No key → always runs.

### 7. Storage — ports & adapters (infra-agnostic)

Depend on the **port**, not a driver or cloud SDK. The concrete adapter is
chosen at boot by a connection URL, so the same code runs on any infra. The core
ships the ports plus in-memory adapters; vendor adapters are optional packages
(roadmap). See [ADR 0004](adr/0004-storage-ports-and-adapters.md).

**Repository** — common-case CRUD over a collection:

```ts
import { InMemoryRepository, type Repository } from '@getexp/core';

interface User { id: string; name: string; }

// In tests/dev: in-memory. In prod: a Postgres adapter behind the same type.
const users: Repository<User> = new InMemoryRepository<User>((u) => u.id);
await users.create({ id: '1', name: 'Ada' });
const u = await users.get('1');
```

```python
from getexp_core import InMemoryRepository, Repository

users: Repository[User, str] = InMemoryRepository(lambda u: u.id)
await users.create(User(id="1", name="Ada"))
```

**BlobStore** — object storage (one port, S3 *and* Azure adapters):

```ts
import { InMemoryBlobStore, type BlobStore } from '@getexp/core';

const blobs: BlobStore = new InMemoryBlobStore();
await blobs.put('invoices/1.pdf', bytes, { contentType: 'application/pdf' });
const url = await blobs.presignedUrl('invoices/1.pdf', { expiresInSeconds: 300 });
```

**HealthCheck** — make `/ready` reflect storage reality:

```ts
import { checkHealth, type HealthCheck } from '@getexp/core';

const checks: HealthCheck[] = [/* db adapter, blob adapter, … */];
app.get('/ready', async (_req, reply) => {
  const report = await checkHealth(checks);
  reply.status(report.healthy ? 200 : 503).send(report);
});
```

Adapter selection by URL scheme: `postgres://` (Postgres), `s3://` (S3/R2/MinIO),
`azblob://` (Azure Blob), `sqlite://` / in-memory (tests). Blessed
implementations: Drizzle (TS) / SQLAlchemy + Alembic (Python) for relational.

---

## How to: create a new app

```bash
pnpm create-app --template api-ts --name billing-api
#   templates: api-ts | api-py | web | mobile

# TS app
pnpm install && pnpm --filter billing-api dev

# Python app
uv sync --all-packages && uv run uvicorn app.main:app --app-dir apps/billing-api
```

The generated app already has config-at-boot, request-id, Problem Details error
handling, `/health` + `/ready`, and a `catalog-info.yaml`. Model new routes on
the matching `apps/reference-api-*` service.

## How to: add a capability to the core

1. Add the module + **tests** to `packages/core/src` *and*
   `python/getexp-core/getexp_core` (keep the two cores mirrored).
2. Export it from each `index.ts` / `__init__.py`.
3. `pnpm check` and `uv run pytest && ruff && mypy` must stay green.
4. Use it from your app. The next app inherits it for free.

## How to: deviate from the frozen stack

Write an ADR in [`adr/`](adr/) explaining the need and the trade-off. No silent
parallel solutions — that is the one rule the whole framework rests on.

---

## Command cheat-sheet

| Task | TypeScript | Python |
| --- | --- | --- |
| Install | `pnpm install` | `uv sync --all-packages` |
| Everything (pre-commit) | `pnpm check` | `uv run pytest && uv run ruff check . && uv run mypy …` |
| Test one package | `pnpm --filter <pkg> test` | `uv run pytest <path>` |
| Lint + format | `pnpm lint` / `pnpm format` | `uv run ruff check . --fix && uv run ruff format .` |
| Run a service | `pnpm --filter <app> dev` | `uv run uvicorn app.main:app --app-dir apps/<app>` |
| Scaffold | `pnpm create-app` | `pnpm create-app` (api-py) |
