import { describe, expect, it } from 'vitest';
import { NotFoundError } from './errors.ts';
import { checkHealth, type HealthCheck, InMemoryBlobStore, InMemoryRepository } from './storage.ts';

interface User {
  id: string;
  name: string;
}

describe('InMemoryRepository', () => {
  it('creates, reads, updates and deletes', async () => {
    const repo = new InMemoryRepository<User>((u) => u.id);
    await repo.create({ id: '1', name: 'Ada' });

    expect(await repo.get('1')).toEqual({ id: '1', name: 'Ada' });
    expect(await repo.list()).toHaveLength(1);

    const updated = await repo.update('1', { name: 'Grace' });
    expect(updated.name).toBe('Grace');

    await repo.delete('1');
    expect(await repo.get('1')).toBeNull();
  });

  it('throws NotFoundError when updating a missing entity', async () => {
    const repo = new InMemoryRepository<User>((u) => u.id);
    await expect(repo.update('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('InMemoryBlobStore', () => {
  it('round-trips a blob and reports existence', async () => {
    const store = new InMemoryBlobStore();
    const data = new TextEncoder().encode('hello');
    await store.put('greeting.txt', data, { contentType: 'text/plain' });

    expect(await store.exists('greeting.txt')).toBe(true);
    expect(new TextDecoder().decode(await store.get('greeting.txt'))).toBe('hello');

    await store.delete('greeting.txt');
    expect(await store.exists('greeting.txt')).toBe(false);
  });

  it('throws NotFoundError for a missing blob and returns a presigned url', async () => {
    const store = new InMemoryBlobStore();
    await expect(store.get('absent')).rejects.toBeInstanceOf(NotFoundError);
    const url = await store.presignedUrl('k', { expiresInSeconds: 60 });
    expect(url).toContain('expires=60');
  });
});

describe('checkHealth', () => {
  it('aggregates checks and treats throwing pings as unhealthy', async () => {
    const ok: HealthCheck = { name: 'db', ping: async () => true };
    const bad: HealthCheck = {
      name: 'blob',
      ping: async () => {
        throw new Error('unreachable');
      },
    };
    const report = await checkHealth([ok, bad]);
    expect(report).toEqual({ healthy: false, checks: { db: true, blob: false } });
  });
});
