import { randomUUID } from 'node:crypto';
import {
  checkHealth,
  type HealthCheck,
  InMemoryBlobStore,
  InMemoryIdempotencyStore,
  InMemoryRepository,
  loggerOptions,
  type StoredResponse,
  toAppError,
  ValidationError,
  withIdempotency,
} from '@getexp/core';
import Fastify, { type FastifyInstance } from 'fastify';
import type { z } from 'zod';
import { config } from './config.ts';
import {
  type Expense,
  ExpenseService,
  type ExpenseStatus,
  receiptSchema,
  rejectSchema,
  submitExpenseSchema,
} from './expenses.ts';

function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue?.message ?? 'Invalid body', {
      details: { field: issue?.path.join('.') },
    });
  }
  return parsed.data;
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions({ level: config.LOG_LEVEL, base: { service: config.SERVICE_NAME } }),
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
  });

  // Storage via ports. Prototype: in-memory. Production swaps these for
  // Postgres / S3 adapters selected by env — buildApp is the only place to change.
  const repo = new InMemoryRepository<Expense>((e) => e.id);
  const receipts = new InMemoryBlobStore();
  const idempotency = new InMemoryIdempotencyStore();
  const service = new ExpenseService(repo, receipts);

  const healthChecks: HealthCheck[] = [
    { name: 'expenses-repo', ping: async () => true },
    { name: 'receipts-blob', ping: async () => true },
  ];

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
  app.get('/ready', async (_request, reply) => {
    const report = await checkHealth(healthChecks);
    return reply.status(report.healthy ? 200 : 503).send(report);
  });

  app.post('/expenses', async (request, reply) => {
    const input = parseOrThrow(submitExpenseSchema, request.body);
    const key = request.headers['idempotency-key'] as string | undefined;
    const result: StoredResponse = await withIdempotency(idempotency, key, async () => {
      const expense = await service.submit(input);
      request.log.info({ expenseId: expense.id }, 'expense.submitted');
      return { status: 201, body: expense };
    });
    return reply.status(result.status).send(result.body);
  });

  app.get('/expenses', async (request) => {
    const { status } = request.query as { status?: ExpenseStatus };
    return service.list(status);
  });

  app.get('/expenses/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.get(id);
  });

  app.post('/expenses/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    return service.approve(id);
  });

  app.post('/expenses/:id/reject', async (request) => {
    const { id } = request.params as { id: string };
    const { comment } = parseOrThrow(rejectSchema, request.body);
    return service.reject(id, comment);
  });

  app.put('/expenses/:id/receipt', async (request) => {
    const { id } = request.params as { id: string };
    const { contentType, dataBase64 } = parseOrThrow(receiptSchema, request.body);
    const data = new Uint8Array(Buffer.from(dataBase64, 'base64'));
    return service.attachReceipt(id, data, contentType);
  });

  app.get('/expenses/:id/receipt-url', async (request) => {
    const { id } = request.params as { id: string };
    return { url: await service.receiptUrl(id) };
  });

  return app;
}
