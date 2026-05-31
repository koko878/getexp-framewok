import { toAppError } from '@getexp/core/errors';

/** Turn any thrown value into an RFC 7807 problem+json Response. */
export function problemResponse(error: unknown): Response {
  const appError = toAppError(error);
  return Response.json(appError.toProblemDetails(), {
    status: appError.httpStatus,
    headers: { 'content-type': 'application/problem+json' },
  });
}
