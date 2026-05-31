/**
 * Structured JSON logging built on Pino.
 *
 * One log format everywhere (12-factor: logs to stdout). Logs are JSON in
 * production/test for machine ingestion, pretty in development. A child logger
 * can be bound to a request/correlation id so every line is traceable — the
 * baseline every Netflix/Uber service ships with on day one.
 *
 * `loggerOptions()` returns the shared Pino config so frameworks that build
 * their own logger (e.g. Fastify) reuse the exact same conventions.
 */
import { type Logger, type LoggerOptions as PinoOptions, pino } from 'pino';

export type { Logger };

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
];

export interface LoggerOptions {
  level?: string;
  /** Pretty-print for local dev. Defaults to true only when NODE_ENV === development. */
  pretty?: boolean;
  /** Static fields added to every line (e.g. service name, version). */
  base?: Record<string, unknown>;
}

export function loggerOptions(options: LoggerOptions = {}): PinoOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const pretty = options.pretty ?? process.env.NODE_ENV === 'development';

  return {
    level: options.level ?? process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    base: options.base ?? {},
    redact: { paths: redactPaths, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  };
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return pino(loggerOptions(options));
}

/** Bind a correlation/request id (and any extra context) to a child logger. */
export function withRequestId(
  logger: Logger,
  requestId: string,
  extra: Record<string, unknown> = {},
): Logger {
  return logger.child({ requestId, ...extra });
}
