# App spec — &lt;app name&gt;

Fill this with the business and graphical decisions, then hand it to the
`getexp-app-builder` agent. Copy it to `docs/specs/<app>.md` per app. Anything
left blank, the builder will fill with a stated assumption.

## 1. Summary
- **What it is** (one or two sentences):
- **Primary user / persona**:
- **Success looks like**:

## 2. Business
- **Core use cases** (the must-haves):
  - [ ] …
- **Entities & key fields** (the data model):
  - `Entity` — field, field, …
- **Rules / constraints** (validation, limits, idempotent operations):

## 3. Surface (shape of the app)
- **Template(s)**: `api-ts` | `api-py` | `web` | `mobile` (one or several)
- **API endpoints** (method · path · purpose):
  - `POST /…` —
- **Screens / flows** (for web/mobile):
  - Screen — what it shows, key actions
- **External services called** (via the resilient HttpClient):

## 4. Graphical / UX (if web or mobile)
- **Look & feel** (tone, brand, density):
- **Key components / layout**:
- **States to cover** (empty, loading, error, success):

## 5. Storage
- **Relational**: `postgres` | `sqlite` | `none`  → which entities are persisted
- **Object/blob**: `s3` | `azblob` | `none`  → what is stored (files, images, …)
- (Adapters are selected at runtime by env URL; prototype uses in-memory.)

## 6. Non-functional
- **Auth** (who can do what), if any:
- **Idempotent endpoints** (safe to retry):
- **Performance / scale** expectations:
- **Target infra** (AWS / Azure / GCP / on-prem / local) — affects `.env` only:

## 7. Build plan
- **Prototype scope** (the thin slice to prove first):
- **Production scope** (what "done" means):
