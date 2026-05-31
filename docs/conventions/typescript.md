# TypeScript conventions

- **Strict everything.** `tsconfig.base.json` enables `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`. Don't loosen it per-package.
- **ESM only.** `"type": "module"`. Use explicit `.ts` extensions in relative
  imports (the repo emits them as `.js` via `rewriteRelativeImportExtensions`).
- **Validate at the boundary.** Parse all external input (HTTP bodies, env,
  third-party responses) with **Zod**. Inside the boundary, trust the types.
- **Errors:** throw `AppError` subclasses from `@getexp/core`. Never throw bare
  strings. Let the app's error handler turn them into Problem Details.
- **Result vs throw:** use `Result` for expected/recoverable outcomes; `throw`
  for truly exceptional cases.
- **No raw `fetch`** to other services — use `HttpClient`.
- **Logging:** `request.log` inside handlers (carries the request id). No
  `console.log` (Biome blocks it outside `tools/`).
- **Tests:** colocated `*.test.ts`, run with Vitest. Test behaviour, not
  internals.
- **Before committing:** `pnpm check` (Biome + tsc + Vitest) must pass.
