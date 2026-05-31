import { describe, expect, it } from 'vitest';
import { InternalError, NotFoundError, toAppError, ValidationError } from './errors.ts';

describe('errors', () => {
  it('exposes a stable problem-details contract', () => {
    const e = new ValidationError('email is required', { details: { field: 'email' } });
    expect(e.toProblemDetails('req-1')).toEqual({
      type: 'validation_error',
      title: 'ValidationError',
      status: 400,
      detail: 'email is required',
      instance: 'req-1',
      details: { field: 'email' },
    });
  });

  it('hides internal error messages from clients', () => {
    const e = new InternalError('db connection string leaked');
    const pd = e.toProblemDetails();
    expect(pd.status).toBe(500);
    expect(pd.detail).toBe('An unexpected error occurred.');
  });

  it('normalizes unknown throwables', () => {
    expect(toAppError(new NotFoundError('x'))).toBeInstanceOf(NotFoundError);
    expect(toAppError('plain string')).toBeInstanceOf(InternalError);
    expect(toAppError(new Error('raw'))).toBeInstanceOf(InternalError);
  });
});
