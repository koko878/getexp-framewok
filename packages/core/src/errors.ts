/**
 * Typed error hierarchy with RFC 7807 "Problem Details" output.
 *
 * Every error carries a stable machine-readable `code`, an HTTP status, and an
 * optional `details` bag. This gives APIs a consistent, documented error
 * contract (the Stripe approach) instead of ad-hoc strings.
 */

export interface ProblemDetails {
  /** Stable, machine-readable error code, e.g. "validation_error". */
  type: string;
  /** Short, human-readable summary. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** Correlates the error to a request/trace. */
  instance?: string;
  /** Extra structured context (safe to expose to clients). */
  details?: Record<string, unknown>;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  /** Whether the message/details are safe to expose to clients. */
  readonly isPublic: boolean = true;
  readonly details?: Record<string, unknown> | undefined;
  override readonly cause?: unknown;

  constructor(message: string, options?: { details?: Record<string, unknown>; cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.details = options?.details;
    this.cause = options?.cause;
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.code,
      title: this.name,
      status: this.httpStatus,
      detail: this.isPublic ? this.message : 'An unexpected error occurred.',
      ...(instance ? { instance } : {}),
      ...(this.isPublic && this.details ? { details: this.details } : {}),
    };
  }
}

export class ValidationError extends AppError {
  readonly code = 'validation_error';
  readonly httpStatus = 400;
}

export class UnauthorizedError extends AppError {
  readonly code = 'unauthorized';
  readonly httpStatus = 401;
}

export class ForbiddenError extends AppError {
  readonly code = 'forbidden';
  readonly httpStatus = 403;
}

export class NotFoundError extends AppError {
  readonly code = 'not_found';
  readonly httpStatus = 404;
}

export class ConflictError extends AppError {
  readonly code = 'conflict';
  readonly httpStatus = 409;
}

export class RateLimitedError extends AppError {
  readonly code = 'rate_limited';
  readonly httpStatus = 429;
}

/** Use for unexpected failures; message is hidden from clients by default. */
export class InternalError extends AppError {
  readonly code = 'internal_error';
  readonly httpStatus = 500;
  override readonly isPublic = false;
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Normalize any thrown value into an AppError. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  return new InternalError(e instanceof Error ? e.message : String(e), { cause: e });
}
