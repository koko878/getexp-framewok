/**
 * Reference Fastify service demonstrating the GetExp Golden Path.
 *
 * Mirrors the Python reference service feature-for-feature:
 *   - config validated at boot (fail fast)
 *   - structured logging with a per-request correlation id
 *   - RFC 7807 Problem Details for every error
 *   - /health and /ready probes
 *   - an idempotent POST endpoint (Stripe-style Idempotency-Key)
 */
import { randomUUID } from 'node:crypto';
import {
  InMemoryIdempotencyStore,
  loggerOptions,
  type StoredResponse,
  toAppError,
  ValidationError,
  withIdempotency,
} from '@getexp/core';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from './config.ts';

const greetSchema = z.object({ name: z.string().trim().min(1, 'name must not be empty') });

export function buildApp(): FastifyInstance {
  const app = Fastify({
    // Reuse the framework's shared logging conventions.
    logger: loggerOptions({ level: config.LOG_LEVEL, base: { service: config.SERVICE_NAME } }),
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
  });

  const idempotencyStore = new InMemoryIdempotencyStore();

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    if (appError.httpStatus >= 500) {
      request.log.error({ err: error }, 'request.unhandled');
    } else {
      request.log.warn({ code: appError.code, status: appError.httpStatus }, 'request.error');
    }
    reply
      .status(appError.httpStatus)
      .type('application/problem+json')
      .send(appError.toProblemDetails(request.id));
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));

  app.post('/greetings', async (request, reply) => {
    const parsed = greetSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body', {
        details: { field: parsed.error.issues[0]?.path.join('.') },
      });
    }

    const key = request.headers['idempotency-key'] as string | undefined;
    const result: StoredResponse = await withIdempotency(idempotencyStore, key, async () => {
      request.log.info({ name: parsed.data.name }, 'greeting.created');
      return { status: 201, body: { message: `Hello, ${parsed.data.name}!` } };
    });

    return reply.status(result.status).send(result.body);
  });

  return app;
}
