/**
 * Resilient HTTP client built on the native fetch.
 *
 * Bundles the three resilience patterns every outbound call should have
 * (popularized by Netflix's Hystrix): a per-attempt timeout, retries with
 * exponential backoff + jitter, and a circuit breaker that stops hammering a
 * failing dependency. Never make a raw `fetch` to another service — use this.
 */

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Base delay in ms for exponential backoff. Default 100. */
  baseDelayMs?: number;
  /** Cap on the backoff delay in ms. Default 2000. */
  maxDelayMs?: number;
  /** HTTP statuses that should trigger a retry. Default 408/429/500/502/503/504. */
  retryableStatuses?: number[];
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. Default 5. */
  failureThreshold?: number;
  /** How long to stay open before probing again, in ms. Default 10000. */
  resetTimeoutMs?: number;
}

export interface HttpClientOptions {
  baseUrl?: string;
  /** Per-attempt timeout in ms. Default 5000. */
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
  /** Injectable for testing. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold: number,
    private readonly resetTimeoutMs: number,
  ) {}

  canRequest(now = Date.now()): boolean {
    if (this.state === 'open') {
      if (now - this.openedAt >= this.resetTimeoutMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(now = Date.now()): void {
    this.failures += 1;
    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.state = 'open';
      this.openedAt = now;
    }
  }

  get current(): CircuitState {
    return this.state;
  }
}

const DEFAULT_RETRYABLE = [408, 429, 500, 502, 503, 504];

function backoffDelay(attempt: number, base: number, max: number): number {
  const exponential = Math.min(max, base * 2 ** attempt);
  // Full jitter (AWS Architecture Blog recommendation) avoids thundering herd.
  return Math.random() * exponential;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpClient {
  private readonly fetchImpl: typeof fetch;
  private readonly breaker: CircuitBreaker;
  private readonly timeoutMs: number;
  private readonly retry: Required<RetryOptions>;

  constructor(private readonly options: HttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.retry = {
      attempts: options.retry?.attempts ?? 3,
      baseDelayMs: options.retry?.baseDelayMs ?? 100,
      maxDelayMs: options.retry?.maxDelayMs ?? 2000,
      retryableStatuses: options.retry?.retryableStatuses ?? DEFAULT_RETRYABLE,
    };
    this.breaker = new CircuitBreaker(
      options.circuitBreaker?.failureThreshold ?? 5,
      options.circuitBreaker?.resetTimeoutMs ?? 10000,
    );
  }

  get circuitState(): CircuitState {
    return this.breaker.current;
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.breaker.canRequest()) {
      throw new CircuitOpenError();
    }

    const url = this.options.baseUrl ? new URL(path, this.options.baseUrl).toString() : path;
    const headers = { ...this.options.defaultHeaders, ...(init.headers as Record<string, string>) };

    let lastError: unknown;
    for (let attempt = 0; attempt < this.retry.attempts; attempt++) {
      if (attempt > 0) {
        await sleep(backoffDelay(attempt - 1, this.retry.baseDelayMs, this.retry.maxDelayMs));
      }
      try {
        const response = await this.fetchImpl(url, {
          ...init,
          headers,
          signal: init.signal ?? AbortSignal.timeout(this.timeoutMs),
        });
        if (this.retry.retryableStatuses.includes(response.status)) {
          lastError = new HttpRequestError(`Upstream returned ${response.status}`, response.status);
          continue;
        }
        this.breaker.onSuccess();
        return response;
      } catch (e) {
        lastError = e;
      }
    }

    this.breaker.onFailure();
    if (lastError instanceof Error) throw lastError;
    throw new HttpRequestError('Request failed');
  }

  async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.request(path, init);
    if (!res.ok) {
      throw new HttpRequestError(`Request to ${path} failed`, res.status);
    }
    return (await res.json()) as T;
  }
}
