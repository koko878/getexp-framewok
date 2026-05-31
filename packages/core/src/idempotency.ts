/**
 * Idempotency-key support (the Stripe pattern).
 *
 * Lets clients safely retry mutating requests: the first request for a given
 * key is executed and its result cached; subsequent requests with the same key
 * return the cached result instead of re-running the side effect.
 *
 * The in-memory store below is for single-instance/dev use. In production back
 * this with a shared store (Redis) implementing the same interface.
 */

export interface StoredResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyStore {
  get(key: string): Promise<StoredResponse | undefined>;
  set(key: string, value: StoredResponse, ttlMs: number): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, { value: StoredResponse; expiresAt: number }>();

  async get(key: string): Promise<StoredResponse | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: StoredResponse, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export interface IdempotencyOptions {
  ttlMs?: number;
}

/**
 * Run `operation` at most once per `key`. Returns the cached response on
 * repeat calls. If `key` is undefined the operation always runs (no caching).
 */
export async function withIdempotency(
  store: IdempotencyStore,
  key: string | undefined,
  operation: () => Promise<StoredResponse>,
  options: IdempotencyOptions = {},
): Promise<StoredResponse> {
  if (!key) return operation();

  const cached = await store.get(key);
  if (cached) return cached;

  const result = await operation();
  await store.set(key, result, options.ttlMs ?? 24 * 60 * 60 * 1000);
  return result;
}
