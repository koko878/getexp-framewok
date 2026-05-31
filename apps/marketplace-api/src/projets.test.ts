import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';

const app = buildApp();
const headers = { 'x-actor': 'alice' };
const useCase = { titre: 'Détection fraude', domaine: 'banque' };

beforeAll(async () => {
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

async function create(body: object = { useCase }, h = headers) {
  return app.inject({ method: 'POST', url: '/projets', payload: body, headers: h });
}

describe('marketplace-api · projets (Repository port)', () => {
  it('creates a projet in brouillon and lists it', async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    const projet = res.json();
    expect(projet).toMatchObject({ statut: 'brouillon', proprietaire: 'alice' });
    expect(projet.donnees.titre).toBe('Détection fraude');

    const list = await app.inject({ method: 'GET', url: '/projets' });
    expect(list.json().some((p: { id: string }) => p.id === projet.id)).toBe(true);
  });

  it('filters by statut and by owner (mine=true)', async () => {
    await create({ useCase, statut: 'soumis' }, headers);
    await create({ useCase }, { 'x-actor': 'bob' });

    const soumis = await app.inject({ method: 'GET', url: '/projets?statut=soumis' });
    expect(soumis.json().every((p: { statut: string }) => p.statut === 'soumis')).toBe(true);

    const mine = await app.inject({
      method: 'GET',
      url: '/projets?mine=true',
      headers: { 'x-actor': 'bob' },
    });
    expect(mine.json().every((p: { proprietaire: string }) => p.proprietaire === 'bob')).toBe(true);
  });

  it('transitions statut via PATCH and 404s on unknown id', async () => {
    const id = (await create()).json().id as string;
    const patched = await app.inject({
      method: 'PATCH',
      url: `/projets/${id}`,
      payload: { statut: 'prototype_valide' },
    });
    expect(patched.json()).toMatchObject({ statut: 'prototype_valide' });

    const missing = await app.inject({ method: 'GET', url: '/projets/nope' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ type: 'not_found' });
  });

  it('rejects an invalid statut with Problem Details', async () => {
    const id = (await create()).json().id as string;
    const bad = await app.inject({
      method: 'PATCH',
      url: `/projets/${id}`,
      payload: { statut: 'xxx' },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ type: 'validation_error' });
  });
});
