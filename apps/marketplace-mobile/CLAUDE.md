# marketplace-mobile — app instructions

Follows the repo-root [`CLAUDE.md`](../../CLAUDE.md). Mobile app of the migrated
tech-consulting marketplace (Expo / React Native).

## Profile

- Template: `mobile` (Expo SDK 56 / RN — matched the original).
- Structure: `App.tsx` (navigator + role toggle) · `src/screens.tsx` ·
  `src/components.tsx` · `src/theme.ts` · `src/api.ts`.
- Screens ported:
  - Demandeur: accueil (mes projets) → **cadrage IA conversationnel** (wizard
    multi-étapes + récap) → détail (valider / demander une révision).
  - Admin (role toggle): liste de tous les projets → détail admin (génération du
    prototype + transitions de statut sur tout le cycle de vie).
- Talks to `marketplace-api` via `src/api.ts` (`EXPO_PUBLIC_API_URL`).

## Working on this app

- The UI calls its own backend with `fetch`; resilience lives server-side
  (`@getexp/core` HttpClient in the API).
- Keep `pnpm --filter marketplace-mobile typecheck` green.

## Overrides (strict + per-app)

- _(none)_ — still to port from the original: real **auth** (replaces the role
  toggle), **voice** input, **file upload** (charte/justificatifs via BlobStore),
  and the LLM-backed cadrage refinement.
