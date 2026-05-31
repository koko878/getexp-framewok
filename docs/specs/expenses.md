# App spec — expenses (notes de frais)

## 1. Summary
- **What it is**: a team expense-report tool. An employee submits an expense
  (amount, category, date, optional receipt photo); a manager approves or rejects
  it (a rejection requires a comment).
- **Primary user / persona**: employees (submit) and managers (review).
- **Success looks like**: an expense can be submitted, listed/filtered, and moved
  to approved/rejected with an audit of who/why.

## 2. Business
- **Core use cases**:
  - [x] Submit an expense
  - [x] List expenses, filter by status
  - [x] Get one expense
  - [x] Approve an expense
  - [x] Reject an expense (comment required)
  - [x] Attach / fetch a receipt image
- **Entities & key fields**:
  - `Expense` — id, employee, amount, currency, category, spentAt (date),
    status (`pending|approved|rejected`), receiptKey?, decisionComment?,
    createdAt
- **Rules / constraints**:
  - amount > 0; currency is a 3-letter code; category from a known set.
  - Only `pending` expenses can be approved/rejected.
  - Rejection requires a non-empty comment.
  - Submit is idempotent (Idempotency-Key) to make retries safe.

## 3. Surface
- **Template(s)**: `api-ts` (Fastify) + `web` (Next.js) — start with the API.
- **API endpoints**:
  - `POST /expenses` — submit (idempotent)
  - `GET /expenses?status=` — list / filter
  - `GET /expenses/:id` — fetch one
  - `POST /expenses/:id/approve` — approve
  - `POST /expenses/:id/reject` — reject (comment required)
  - `PUT /expenses/:id/receipt` — upload a receipt (bytes → BlobStore)
  - `GET /expenses/:id/receipt-url` — presigned URL to view the receipt
- **Screens / flows (web)**: expenses list (with status filter) · submit form ·
  manager actions (approve / reject with comment).

## 4. Graphical / UX
- Clean, minimal, system font. Status shown as a colored badge. States covered:
  empty list, loading, validation error, success.

## 5. Storage
- **Relational**: `postgres` → expenses (prototype uses InMemoryRepository).
- **Object/blob**: `s3` → receipt images (prototype uses InMemoryBlobStore).

## 6. Non-functional
- **Auth**: out of scope for the prototype (assume an `x-actor` header names the
  caller; real auth is a production concern).
- **Idempotent endpoints**: `POST /expenses`.
- **Target infra**: decided at deploy time via `.env` (AWS or Azure).

## 7. Build plan
- **Prototype scope**: the full API vertical slice, in-memory storage, tests +
  running locally. Web scaffolded with the list+submit screen.
- **Production scope**: Postgres + S3/Azure adapters, auth, migrations.
