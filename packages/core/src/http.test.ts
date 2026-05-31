import { describe, expect, it, vi } from 'vitest';
import { CircuitOpenError, HttpClient } from './http.ts';

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpClient', () => {
  it('retries retryable statuses then succeeds', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const client = new HttpClient({
      fetchImpl,
      retry: { attempts: 3, baseDelayMs: 1, maxDelayMs: 1 },
    });

    const body = await client.json<{ ok: boolean }>('https://api.test/x');
    expect(body).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after repeated failures', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(500));
    const client = new HttpClient({
      fetchImpl,
      retry: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1 },
      circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 10_000 },
    });

    await expect(client.request('https://api.test/x')).rejects.toThrow();
    await expect(client.request('https://api.test/x')).rejects.toThrow();
    expect(client.circuitState).toBe('open');

    // Circuit is open: the call short-circuits without hitting fetch.
    const callsBefore = fetchImpl.mock.calls.length;
    await expect(client.request('https://api.test/x')).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fetchImpl.mock.calls.length).toBe(callsBefore);
  });

  it('resolves base url against path', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, {}));
    const client = new HttpClient({ baseUrl: 'https://api.test/v1/', fetchImpl });
    await client.request('users');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/users', expect.anything());
  });
});
