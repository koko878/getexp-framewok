import { randomUUID } from 'node:crypto';
import {
  InMemoryRepository,
  loggerOptions,
  ServiceUnavailableError,
  toAppError,
  ValidationError,
} from '@getexp/core';
import Fastify, { type FastifyInstance } from 'fastify';
import { type GenerateFn, generatePrototype } from './agent.ts';
import { config } from './config.ts';
import { type Projet, ProjetService, registerProjetRoutes } from './projets.ts';
import { useCaseSchema } from './types.ts';

export interface AppDeps {
  /** Injectable prototype generator (tests pass a fake; defaults to the real agent). */
  generate?: GenerateFn;
}

export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const generate = deps.generate ?? generatePrototype;

  const app = Fastify({
    logger: loggerOptions({ level: config.LOG_LEVEL, base: { service: config.SERVICE_NAME } }),
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
  });

  // Persistence via the Repository port — in-memory for the prototype, swapped
  // for a Postgres/Supabase adapter at the production stage with no route changes.
  const projets = new ProjetService(new InMemoryRepository<Projet>((p) => p.id));

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

  app.get('/health', async () => ({ status: 'ok', service: config.SERVICE_NAME }));

  app.get('/ready', async () => ({
    status: 'ready',
    anthropicKeyConfigured: Boolean(config.ANTHROPIC_API_KEY),
    model: config.ANTHROPIC_MODEL,
    effort: config.ANTHROPIC_EFFORT,
  }));

  app.get('/model', async () => {
    if (!config.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('ANTHROPIC_API_KEY is not configured server-side');
    }
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const model = await new Anthropic().models.retrieve(config.ANTHROPIC_MODEL);
    return {
      requested: config.ANTHROPIC_MODEL,
      resolved: model.id,
      displayName: model.display_name,
      effort: config.ANTHROPIC_EFFORT,
    };
  });

  app.post('/generate', async (request) => {
    const body = request.body as { useCase?: unknown } | null;
    const parsed = useCaseSchema.safeParse(body?.useCase);
    if (!parsed.success) {
      throw new ValidationError('useCase manquant ou invalide', {
        details: { field: parsed.error.issues[0]?.path.join('.') ?? 'useCase' },
      });
    }
    if (!config.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('ANTHROPIC_API_KEY is not configured server-side');
    }
    request.log.info({ titre: parsed.data.titre }, 'prototype.generate.start');
    const { html, journal } = await generate(parsed.data, (m) => request.log.debug({ step: m }));
    return { html, journal };
  });

  registerProjetRoutes(app, projets);

  return app;
}
