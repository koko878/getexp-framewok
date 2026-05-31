import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('reference-api-ts', () => {
  it('GET /health returns ok with a request id', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('POST /greetings rejects empty name with problem details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/greetings',
      payload: { name: '   ' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json()).toMatchObject({ type: 'validation_error', status: 400 });
  });

  it('POST /greetings is idempotent for a repeated key', async () => {
    const headers = { 'idempotency-key': 'abc-123' };
    const first = await app.inject({
      method: 'POST',
      url: '/greetings',
      headers,
      payload: { name: 'Ada' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/greetings',
      headers,
      payload: { name: 'Grace' },
    });
    expect(first.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());
    expect(second.json()).toEqual({ message: 'Hello, Ada!' });
  });
});
