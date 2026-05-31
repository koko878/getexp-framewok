/**
 * 12-factor configuration: load from the environment, validate with Zod, and
 * fail fast at boot if anything is missing or malformed.
 *
 * A service should never start in a half-configured state — crashing loudly at
 * startup is far cheaper than discovering a bad config in production traffic.
 */
import { z } from 'zod';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Parse and validate configuration from a source object (defaults to
 * process.env). Throws ConfigError with a readable summary on failure.
 */
export function loadConfig<T extends z.ZodType>(
  schema: T,
  source: Record<string, unknown> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${issues}`);
  }
  return result.data;
}

/** Common env primitives reused across services. */
export const env = {
  string: () => z.string().min(1),
  port: () => z.coerce.number().int().min(1).max(65535),
  bool: () => z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1'),
  nodeEnv: () => z.enum(['development', 'test', 'production']).default('development'),
  logLevel: () => z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
};
