# GetExp Framework — Documentation

Start here. The docs are organized from "the rules" → "the design" → "how to
use it" → "why it's built this way".

## Read in this order

1. **[../CLAUDE.md](../CLAUDE.md)** — the doctrine: frozen stack, the three
   rules, and what to do when building an app. *Read this first.*
2. **[golden-path.md](golden-path.md)** — why a framework at all; what "good"
   looks like.
3. **[high-level-design.md](high-level-design.md)** — the architecture: system
   context, layers, building-blocks catalog, request lifecycle, resilience,
   scaffolding & CI flow, deployment view, roadmap (with diagrams).
4. **[reference.md](reference.md)** — usage guide: every building block with
   TypeScript + Python examples, plus how to create an app and extend the core.

## Conventions

- **[conventions/typescript.md](conventions/typescript.md)**
- **[conventions/python.md](conventions/python.md)**

## Decisions (ADRs)

- **[adr/0001-stack-choices.md](adr/0001-stack-choices.md)** — the frozen stack.
- **[adr/0002-monorepo.md](adr/0002-monorepo.md)** — monorepo + source-first
  internal packages.
- **[adr/0003-observability.md](adr/0003-observability.md)** — OpenTelemetry +
  Jaeger.
- **[adr/0004-storage-ports-and-adapters.md](adr/0004-storage-ports-and-adapters.md)**
  — infra-agnostic storage (Postgres, S3, Azure Blob).

## Lineage

- **[upstream-oss.md](upstream-oss.md)** — what we borrow from Spotify, Netflix,
  Uber, Stripe and Google, and whether we adopt the project or the pattern.

## Map

| I want to… | Go to |
| --- | --- |
| Know the rules / stack | [CLAUDE.md](../CLAUDE.md) |
| Understand the architecture | [high-level-design.md](high-level-design.md) |
| Use a building block | [reference.md](reference.md) |
| Create a new app | [reference.md#how-to-create-a-new-app](reference.md) |
| Add to the core | [reference.md#how-to-add-a-capability-to-the-core](reference.md) |
| Understand a choice | [adr/](adr/) |
| See the OSS lineage | [upstream-oss.md](upstream-oss.md) |
