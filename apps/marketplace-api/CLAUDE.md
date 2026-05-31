# marketplace-api — app instructions

This app follows the GetExp framework doctrine in the **repo-root**
[`CLAUDE.md`](../../CLAUDE.md) — read that first. This file records THIS app's
profile and any per-app overrides.

## Profile

- Template: `api-ts` (Fastify, type: service)
- Storage: none (stateless prototype generator; the marketplace's data lives in
  the mobile app / Supabase, migrated separately).
- Role: ports the original Express backend — exposes the **agentic Claude loop**
  that generates a self-contained `index.html` prototype from a use case.
- Endpoints: `GET /health`, `GET /ready`, `GET /model`, `POST /generate`.

## Working on this app

- Built on `@getexp/core`: validated config (boot), Problem Details errors
  (incl. `ServiceUnavailableError` 503 when the API key is missing), structured
  logging + request id.
- `ANTHROPIC_API_KEY` stays server-side; the app boots without it and returns
  503 on the LLM endpoints until it is set.
- Keep the gates green (`pnpm check`).

## Overrides (strict + per-app)

The frozen stack applies by default. Deviations for THIS app, justified:

- **Uses `@anthropic-ai/sdk` directly** (not the framework `HttpClient`): the
  agentic *tool-use streaming* loop is exactly what the official SDK provides,
  and it ships its own timeouts/retries. Wrapping it in the generic client would
  lose tool-use ergonomics.
- **The agent runs shell + file tools in a per-job isolated temp workspace**
  (path-traversal guarded, 15s timeout, no network) — inherent to the
  "prototype generator" use case.
