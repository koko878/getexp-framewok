import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateFn } from './agent.ts';

const validBody = { useCase: { titre: 'Suivi qualité', domaine: 'industrie' } };

/** Build the app with a controlled env (config is read at import time). */
async function makeApp(opts: { key?: string; generate?: GenerateFn } = {}) {
  vi.stubEnv('ANTHROPIC_API_KEY', opts.key ?? '');
  vi.resetModules();
  const { buildApp } = await import('./app.ts');
  const app = buildApp(opts.generate ? { generate: opts.generate } : {});
  await app.ready();
  return app;
}

describe('marketplace-api', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET /health returns ok', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
    await app.close();
  });

  it('GET /ready reports config diagnostics', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.json()).toMatchObject({
      status: 'ready',
      anthropicKeyConfigured: false,
      model: 'claude-opus-4-8',
    });
    await app.close();
  });

  it('POST /generate rejects an invalid useCase with Problem Details (400)', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/generate', payload: { useCase: {} } });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json()).toMatchObject({ type: 'validation_error' });
    await app.close();
  });

  it('POST /generate returns 503 when the API key is missing', async () => {
    const app = await makeApp({ generate: async () => ({ html: '', journal: [] }) });
    const res = await app.inject({ method: 'POST', url: '/generate', payload: validBody });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ type: 'service_unavailable' });
    await app.close();
  });

  it('POST /generate runs the (stubbed) agent when the key is configured', async () => {
    const app = await makeApp({
      key: 'sk-test',
      generate: async (uc) => ({ html: `<h1>${uc.titre}</h1>`, journal: ['ok'] }),
    });
    const res = await app.inject({ method: 'POST', url: '/generate', payload: validBody });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ journal: ['ok'] });
    expect(res.json().html).toContain('Suivi qualité');
    await app.close();
  });
});
