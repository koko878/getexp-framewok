# Upstream open source — what we borrow, and from whom

This framework doesn't reinvent good ideas — it adopts the open-source projects
and patterns that Spotify, Netflix, Uber, Stripe and Google built and proved at
scale. Two categories:

1. **Adopt the project directly** when it's language-agnostic and fits our
   TS/Python stack.
2. **Adopt the pattern** (re-implemented idiomatically in `@getexp/core` /
   `getexp_core`) when the original is JVM/Go-only and dropping it in would
   drag in a foreign runtime.

## Direct adoptions

| Project | From | License | How we use it |
| --- | --- | --- | --- |
| **[Backstage](https://backstage.io)** | Spotify (CNCF) | Apache-2.0 | Developer-portal model. Our `create-app` mirrors Backstage **Software Templates**; every app ships a `catalog-info.yaml` so the repo is **Software Catalog**-ready the day we stand up a portal. The whole framework is Spotify's **"Golden Path"** idea. |
| **[OpenTelemetry](https://opentelemetry.io)** | CNCF (industry-wide) | Apache-2.0 | The single, vendor-neutral standard for traces/metrics/logs. SDKs for both Node and Python. Replaces building our own metrics/tracing. |
| **[Jaeger](https://www.jaegertracing.io)** | Uber (CNCF) | Apache-2.0 | Default distributed-tracing backend; OpenTelemetry exports to it. Turns the `x-request-id` we already thread into end-to-end traces. |
| **[Temporal](https://temporal.io)** (ex-**Cadence**) | Uber | MIT | Durable workflow orchestration — adopt when an app needs reliable multi-step/long-running processes (sagas, retries, scheduled jobs). |
| **[H3](https://h3geo.org)** | Uber | Apache-2.0 | Hexagonal geospatial indexing — has first-class JS and Python bindings. Adopt for any geo/location feature. |

## Patterns we re-implement (origin → our building block)

| Pattern | Origin (OSS) | Our implementation |
| --- | --- | --- |
| Circuit breaker + timeout + retry/backoff | Netflix **Hystrix** (maintenance mode) / **resilience4j** (JVM) | `HttpClient` in `@getexp/core` and `getexp_core` |
| Idempotency keys for safe retries | **Stripe** API design | `withIdempotency` / `with_idempotency` |
| RFC 7807 Problem Details error contract | **Stripe**-style typed errors + the IETF standard | `AppError` family → `toProblemDetails` |
| Structured JSON logs + correlation id | Netflix/Uber service baseline | `createLogger` / `configure_logging` + `x-request-id` |
| Fail-fast config validation | 12-factor (Heroku) | `loadConfig` (Zod / Pydantic) |

## Practices to adopt as the framework matures

- **Chaos engineering** — Netflix **Chaos Monkey** / **Simian Army**
  (Apache-2.0). Once apps run on real infra, inject failure to prove the
  resilience patterns above actually hold.
- **SRE / error budgets** — Google SRE practice. Pair the `/health` + `/ready`
  probes and OpenTelemetry metrics with SLOs and error budgets.
- **Golden Path scorecards** — Spotify uses Backstage **Soundcheck**-style
  scorecards to measure how well services follow the paved road. Our CI gate is
  the minimum-viable version of that.

## Why not just install Netflix/Uber's stacks wholesale?

Most of their famous OSS (Hystrix, Atlas, Eureka, Zuul, Spectator; Cadence's
core) targets the **JVM or Go**. Bolting those onto a TypeScript/Python product
adds a second runtime and operational surface for little gain. The
language-agnostic winners — **Backstage, OpenTelemetry, Jaeger, Temporal, H3**
— we adopt directly; the rest we honor by re-implementing the *pattern* in our
own typed, tested core. See `docs/adr/0003-observability.md`.
