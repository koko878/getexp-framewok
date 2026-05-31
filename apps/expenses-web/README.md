# expenses-web — notes de frais (Next.js, full-stack)

**Self-contained**: the UI *and* the API live here. The expense endpoints are
Next route handlers (`app/api/...`) that reuse `@getexp/core` (validation,
Problem Details, the `Repository` storage port, in-memory adapter). So this app
**deploys as ONE service** — no separate backend to host.

## Test it from your phone (no terminal) — Vercel

1. On your phone browser, go to **vercel.com** and sign in **with GitHub**.
2. **Add New… → Project**, and authorize access to `koko878/getexp-framewok`.
3. Import the repo, then in the configuration:
   - **Branch**: `claude/dev-framework-design-TQHSM`
   - **Root Directory**: tap *Edit* and pick **`apps/expenses-web`**
   - Framework Preset: **Next.js** (auto-detected); leave build/install as default
     (Vercel installs the pnpm workspace automatically).
4. Tap **Deploy**. After ~1–2 min you get a public URL
   **`https://<project>.vercel.app`** — open it on your phone: you'll see the
   list (2 sample expenses), the submit form, and approve/reject.

> The prototype uses **in-memory** storage, so data may reset between serverless
> instances. Real persistence (Postgres + S3/Azure) is the PRODUCTION stage.

Every push to that branch redeploys automatically.

## Run it locally (when you have a terminal)

```bash
pnpm install
pnpm --filter expenses-web dev        # http://localhost:3000  (UI + /api together)
```

`NEXT_PUBLIC_API_URL` is empty by default (same-origin `/api` route handlers).
Set it to point the UI at the standalone Fastify service (`apps/expenses-api`)
instead. See the repo-root `CLAUDE.md` and `docs/working-with-claude-code.md`.
