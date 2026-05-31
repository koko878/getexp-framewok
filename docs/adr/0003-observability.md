# ADR 0003 — Observability via OpenTelemetry (+ Jaeger)

- Status: Accepted
- Date: 2026-05-31

## Context

Netflix, Uber and Google each built their own metrics/tracing stacks (Atlas,
M3/Jaeger, Monarch). Most are JVM/Go and tied to their infra. We need
observability that works for TypeScript and Python without adopting a foreign
runtime.

## Decision

- **OpenTelemetry** (CNCF) is the single standard for traces, metrics and logs.
  It has mature Node and Python SDKs and is vendor-neutral, so we are not locked
  to any backend.
- **Jaeger** (originally Uber, now CNCF) is the default tracing backend in
  development; OTel exports to it. In production any OTLP-compatible backend
  works.
- The framework already threads a `x-request-id` correlation id through logs.
  OTel instrumentation upgrades that to full distributed traces; the request id
  is recorded as a span attribute so logs and traces join up.

OTel is wired in via an `instrumentation` bootstrap imported before the app, and
is a **no-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set**, so local/dev runs
stay quiet and CI doesn't need a collector.

## Consequences

- One observability vocabulary across both languages.
- Backend choice (Jaeger, Grafana Tempo, Datadog, …) is a deployment detail.
- See `docs/upstream-oss.md` for how this relates to the patterns we re-implement
  (resilience) versus adopt wholesale (OTel, Jaeger).
