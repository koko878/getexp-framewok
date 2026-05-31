import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

const validExpense = {
  employee: 'ada',
  amount: 42.5,
  currency: 'EUR',
  category: 'meals',
  spentAt: '2026-05-20',
};

async function submit(body = validExpense, headers: Record<string, string> = {}) {
  return app.inject({ method: 'POST', url: '/expenses', payload: body, headers });
}

describe('expenses-api', () => {
  it('GET /health is ok and GET /ready aggregates storage health', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ healthy: true });
  });

  it('submits, lists, filters and approves an expense', async () => {
    const created = await submit();
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    expect(created.json()).toMatchObject({ status: 'pending', employee: 'ada' });

    const pending = await app.inject({ method: 'GET', url: '/expenses?status=pending' });
    expect(pending.json().some((e: { id: string }) => e.id === id)).toBe(true);

    const approved = await app.inject({ method: 'POST', url: `/expenses/${id}/approve` });
    expect(approved.json()).toMatchObject({ status: 'approved' });
  });

  it('rejects validation errors with Problem Details', async () => {
    const res = await submit({ ...validExpense, amount: -1 });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json()).toMatchObject({ type: 'validation_error', details: { field: 'amount' } });
  });

  it('returns 404 Problem Details for a missing expense', async () => {
    const res = await app.inject({ method: 'GET', url: '/expenses/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ type: 'not_found' });
  });

  it('requires a comment to reject, and forbids deciding twice (409)', async () => {
    const id = (await submit()).json().id as string;

    const noComment = await app.inject({
      method: 'POST',
      url: `/expenses/${id}/reject`,
      payload: {},
    });
    expect(noComment.statusCode).toBe(400);

    const rejected = await app.inject({
      method: 'POST',
      url: `/expenses/${id}/reject`,
      payload: { comment: 'missing receipt' },
    });
    expect(rejected.json()).toMatchObject({
      status: 'rejected',
      decisionComment: 'missing receipt',
    });

    const again = await app.inject({ method: 'POST', url: `/expenses/${id}/approve` });
    expect(again.statusCode).toBe(409);
  });

  it('is idempotent on submit for a repeated Idempotency-Key', async () => {
    const headers = { 'idempotency-key': 'expense-key-1' };
    const first = await submit(validExpense, headers);
    const second = await submit({ ...validExpense, amount: 999 }, headers);
    expect(second.json().id).toBe(first.json().id);
    expect(second.json().amount).toBe(42.5);
  });

  it('attaches a receipt and returns a presigned url', async () => {
    const id = (await submit()).json().id as string;
    const dataBase64 = Buffer.from('fake-image-bytes').toString('base64');
    const attached = await app.inject({
      method: 'PUT',
      url: `/expenses/${id}/receipt`,
      payload: { contentType: 'image/png', dataBase64 },
    });
    expect(attached.json().receiptKey).toBe(`receipts/${id}`);

    const url = await app.inject({ method: 'GET', url: `/expenses/${id}/receipt-url` });
    expect(url.json().url).toContain(encodeURIComponent(`receipts/${id}`));
  });
});
