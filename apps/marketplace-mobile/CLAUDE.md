# marketplace-mobile — app instructions

Follows the repo-root [`CLAUDE.md`](../../CLAUDE.md). This is the **mobile slice**
of the migrated tech-consulting marketplace (Expo / React Native).

## Profile

- Template: `mobile` (Expo SDK 56 / RN — versions already matched the original).
- Flow ported: accueil (liste des projets) → cadrage (formulaire) → détail
  (statut, valider, générer le prototype).
- Talks to `marketplace-api` via `src/api.ts` (set `EXPO_PUBLIC_API_URL`).

## Working on this app

- The UI calls its own backend with `fetch`; resilience lives server-side in the
  API (`@getexp/core` HttpClient). Share types/schemas with the API as it grows.
- Keep `pnpm --filter marketplace-mobile typecheck` green.

## Overrides (strict + per-app)

- _(none)_ — note: full original screens (auth, admin, voice, file upload) are
  out of this prototype slice; port them in subsequent passes.
