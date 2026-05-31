# expenses-web — app instructions

This app follows the GetExp framework doctrine in the **repo-root**
[`CLAUDE.md`](../../CLAUDE.md) — read that first. This file records THIS
app's profile and any per-app overrides.

## Profile

- Template: `web` (type: website)

## Working on this app

- Import building blocks from `@getexp/core` / `getexp_core`; never re-implement them.
- Model new code on `apps/reference-api-ts` / `apps/reference-api-py`.
- Depend on storage **ports**, not drivers; the adapter is chosen by env URL.
- Keep the gates green (`pnpm check` or the Python equivalents).

## Overrides (strict + per-app)

The frozen stack applies by default. To deviate **for this app only**, add a
line below with a one-line justification. Anything not listed MUST follow the
root doctrine.

- _(none yet)_
