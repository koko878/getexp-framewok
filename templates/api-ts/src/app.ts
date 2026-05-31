import { randomUUID } from 'node:crypto';
import { loggerOptions, toAppError } from '@getexp/core';
import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.ts';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions({ level: config.LOG_LEVEL, base: { service: config.SERVICE_NAME } }),
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    if (appError.httpStatus >= 500) request.log.error({ err: error }, 'request.unhandled');
    else request.log.warn({ code: appError.code }, 'request.error');
    reply
      .status(appError.httpStatus)
      .type('application/problem+json')
      .send(appError.toProblemDetails(request.id));
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));

  // Add your routes here. Throw AppError subclasses from @getexp/core; the
  // error handler above turns them into RFC 7807 Problem Details.

  return app;
}
