/**
 * Storage ports (hexagonal / ports & adapters).
 *
 * App code depends on these interfaces, never on a database driver or cloud
 * SDK directly. Concrete adapters (Postgres, S3, Azure Blob, …) live in
 * separate optional packages and are selected at boot by configuration (a
 * connection URL). That is what makes storage plug-and-play across infra:
 * swapping a vendor is a config change, not a code change.
 *
 * This module ships the contracts plus in-memory adapters for tests and
 * single-instance/dev use. See docs/adr/0004-storage-ports-and-adapters.md.
 */
import { NotFoundError } from './errors.ts';

// ---------------------------------------------------------------------------
// Repository — the common-case CRUD contract over a collection of entities.
// Complex queries may drop to the underlying ORM; repositories keep the 80%
// case portable and trivially testable with InMemoryRepository.
// ---------------------------------------------------------------------------

export interface Repository<T, Id = string> {
  get(id: Id): Promise<T | null>;
  list(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: Id, patch: Partial<T>): Promise<T>;
  delete(id: Id): Promise<void>;
}

export class InMemoryRepository<T, Id = string> implements Repository<T, Id> {
  private readonly items = new Map<Id, T>();

  constructor(private readonly idOf: (entity: T) => Id) {}

  async get(id: Id): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<T[]> {
    return [...this.items.values()];
  }

  async create(entity: T): Promise<T> {
    this.items.set(this.idOf(entity), entity);
    return entity;
  }

  async update(id: Id, patch: Partial<T>): Promise<T> {
    const existing = this.items.get(id);
    if (existing === undefined) throw new NotFoundError(`Entity ${String(id)} not found`);
    const updated = { ...existing, ...patch };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: Id): Promise<void> {
    this.items.delete(id);
  }
}

// ---------------------------------------------------------------------------
// BlobStore — object/blob storage behind one contract. Adapters: S3-compatible
// (AWS S3 / GCS interop / Cloudflare R2 / MinIO) and Azure Blob Storage.
// ---------------------------------------------------------------------------

export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface PresignOptions {
  /** URL validity in seconds. Default 3600. */
  expiresInSeconds?: number;
  /** Whether the URL is for download or upload. Default 'get'. */
  operation?: 'get' | 'put';
}

export interface BlobStore {
  put(key: string, data: Uint8Array, options?: PutOptions): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** A time-limited URL clients can use directly, bypassing the service. */
  presignedUrl(key: string, options?: PresignOptions): Promise<string>;
}

export class InMemoryBlobStore implements BlobStore {
  private readonly blobs = new Map<string, { data: Uint8Array; options?: PutOptions }>();

  async put(key: string, data: Uint8Array, options?: PutOptions): Promise<void> {
    this.blobs.set(key, options ? { data, options } : { data });
  }

  async get(key: string): Promise<Uint8Array> {
    const blob = this.blobs.get(key);
    if (!blob) throw new NotFoundError(`Blob ${key} not found`);
    return blob.data;
  }

  async exists(key: string): Promise<boolean> {
    return this.blobs.has(key);
  }

  async delete(key: string): Promise<void> {
    this.blobs.delete(key);
  }

  async presignedUrl(key: string, options: PresignOptions = {}): Promise<string> {
    const expires = options.expiresInSeconds ?? 3600;
    return `memory://blob/${encodeURIComponent(key)}?op=${options.operation ?? 'get'}&expires=${expires}`;
  }
}

// ---------------------------------------------------------------------------
// HealthCheck — storage adapters report readiness so /ready reflects reality.
// ---------------------------------------------------------------------------

export interface HealthCheck {
  readonly name: string;
  ping(): Promise<boolean>;
}

export interface HealthReport {
  healthy: boolean;
  checks: Record<string, boolean>;
}

/** Ping every dependency; a failed ping (or throw) marks that check unhealthy. */
export async function checkHealth(checks: HealthCheck[]): Promise<HealthReport> {
  const entries = await Promise.all(
    checks.map(async (c) => {
      try {
        return [c.name, await c.ping()] as const;
      } catch {
        return [c.name, false] as const;
      }
    }),
  );
  const result: Record<string, boolean> = {};
  for (const [name, ok] of entries) result[name] = ok;
  return { healthy: entries.every(([, ok]) => ok), checks: result };
}
