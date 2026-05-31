import { describe, expect, it, vi } from 'vitest';
import { InMemoryIdempotencyStore, withIdempotency } from './idempotency.ts';

describe('idempotency', () => {
  it('runs the operation once per key and caches the result', async () => {
    const store = new InMemoryIdempotencyStore();
    const op = vi.fn().mockResolvedValue({ status: 201, body: { id: 1 } });

    const first = await withIdempotency(store, 'key-1', op);
    const second = await withIdempotency(store, 'key-1', op);

    expect(first).toEqual({ status: 201, body: { id: 1 } });
    expect(second).toEqual(first);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('always runs when no key is provided', async () => {
    const store = new InMemoryIdempotencyStore();
    const op = vi.fn().mockResolvedValue({ status: 200, body: {} });
    await withIdempotency(store, undefined, op);
    await withIdempotency(store, undefined, op);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('expires entries after the ttl', async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set('k', { status: 200, body: 'old' }, 5);
    await new Promise((r) => setTimeout(r, 15));
    expect(await store.get('k')).toBeUndefined();
  });
});
