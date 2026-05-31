# ADR 0002 — Monorepo with source-first internal packages

- Status: Accepted
- Date: 2026-05-31

## Context

We have shared building blocks in two languages and multiple apps that consume
them. We want changes to a building block to be immediately usable by apps
without a publish/version dance.

## Decision

A single monorepo:

- **pnpm workspaces** for TypeScript (`packages/*`, `apps/*`).
- **uv workspaces** for Python (`python/getexp-core`, Python apps).

TypeScript internal packages are **source-first**: `@getexp/core` exposes its
`./src/*.ts` directly via the `exports` map. Apps run with `tsx` and test with
Vitest, both of which consume TypeScript directly — so editing core is instantly
reflected, with no build step in the inner loop. `tsc` still type-checks
everything and can emit `dist/` (we enable `rewriteRelativeImportExtensions` so
explicit `.ts` import specifiers emit as `.js`).

Production builds bundle the app (e.g. with esbuild/tsup) or run via `tsx` in
the container; we do not ship raw source to a bare `node`.

## Consequences

- Fast inner loop; one-line dependency wiring (`"@getexp/core": "workspace:*"`).
- Single `pnpm check` / `uv run pytest` validates the whole repo.
- The reference apps live alongside the libraries they exercise.
