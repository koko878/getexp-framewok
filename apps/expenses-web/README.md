# expenses-web — notes de frais (web)

GetExp Golden Path web app (Next.js, App Router). Talks to `expenses-api`.

## Run it locally

Two terminals, from the repo root:

```bash
# Terminal 1 — the API (Fastify)
PORT=8000 pnpm --filter expenses-api start        # http://localhost:8000

# Terminal 2 — the web (Next.js)
pnpm --filter expenses-web dev                     # http://localhost:3000
```

Open **http://localhost:3000**: submit an expense, filter by status, approve /
reject. The web points at the API via `NEXT_PUBLIC_API_URL` (default
`http://localhost:8000`, see `.env.example`).

## Get a temporary public link to share

The web calls the API from the **browser**, so expose **both** ports. Easiest,
no install (pure npm):

```bash
# two more terminals, once the API + web are running
npx localtunnel --port 8000        # → https://<random>.loca.lt   (the API)
npx localtunnel --port 3000        # → https://<random>.loca.lt   (the web)
```

Start the web pointed at the API's public URL so the browser can reach it:

```bash
NEXT_PUBLIC_API_URL=https://<api-subdomain>.loca.lt pnpm --filter expenses-web dev
```

Alternative tunnel (Cloudflare, no account):

```bash
npx cloudflared tunnel --url http://localhost:3000   # → https://<random>.trycloudflare.com
npx cloudflared tunnel --url http://localhost:8000
```

Share the **web** URL. Tunnels are temporary — they live only while the command
runs. For a durable URL, deploy the web (Vercel) and the API (any container
host); ask Claude to generate the deploy artifacts.

See the repo-root `CLAUDE.md` and `docs/working-with-claude-code.md`.
