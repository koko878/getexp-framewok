import { randomUUID } from 'node:crypto';
import { NotFoundError, type Repository, ValidationError } from '@getexp/core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { type UseCase, useCaseSchema } from './types.ts';

/** Lifecycle of a use case on the marketplace (ported from the original app). */
export const STATUTS = [
  'brouillon',
  'soumis',
  'prototype_pret_admin',
  'prototype_genere',
  'revision_demandee',
  'prototype_valide',
  'cadrage_technique',
  'pret_a_packager',
  'certifie',
] as const;

export type Statut = (typeof STATUTS)[number];

export interface Projet {
  id: string;
  proprietaire: string;
  donnees: UseCase;
  statut: Statut;
  protoHtml?: string;
  creeLe: string;
  majLe: string;
}

const createSchema = z.object({
  useCase: useCaseSchema,
  statut: z.enum(STATUTS).default('brouillon'),
});

const patchSchema = z.object({
  statut: z.enum(STATUTS).optional(),
  donnees: useCaseSchema.optional(),
  protoHtml: z.string().optional(),
});

export type ProjetPatch = z.infer<typeof patchSchema>;

/** Project persistence behind the Repository port: in-memory now, Postgres/Supabase later. */
export class ProjetService {
  constructor(private readonly repo: Repository<Projet>) {}

  async create(proprietaire: string, donnees: UseCase, statut: Statut): Promise<Projet> {
    const now = new Date().toISOString();
    return this.repo.create({
      id: randomUUID(),
      proprietaire,
      donnees,
      statut,
      creeLe: now,
      majLe: now,
    });
  }

  async list(filter: { statut?: Statut; proprietaire?: string }): Promise<Projet[]> {
    const all = await this.repo.list();
    return all.filter(
      (p) =>
        (!filter.statut || p.statut === filter.statut) &&
        (!filter.proprietaire || p.proprietaire === filter.proprietaire),
    );
  }

  async get(id: string): Promise<Projet> {
    const projet = await this.repo.get(id);
    if (!projet) throw new NotFoundError(`Projet ${id} introuvable`);
    return projet;
  }

  async patch(id: string, patch: ProjetPatch): Promise<Projet> {
    await this.get(id);
    // Build the update explicitly so we never assign `undefined` to optional
    // fields (exactOptionalPropertyTypes).
    const update: Partial<Projet> = { majLe: new Date().toISOString() };
    if (patch.statut !== undefined) update.statut = patch.statut;
    if (patch.donnees !== undefined) update.donnees = patch.donnees;
    if (patch.protoHtml !== undefined) update.protoHtml = patch.protoHtml;
    return this.repo.update(id, update);
  }
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Corps invalide', {
      details: { field: parsed.error.issues[0]?.path.join('.') },
    });
  }
  return parsed.data;
}

/** Register the project CRUD routes (`x-actor` header identifies the caller). */
export function registerProjetRoutes(app: FastifyInstance, service: ProjetService): void {
  const actor = (req: { headers: Record<string, unknown> }) =>
    (req.headers['x-actor'] as string) ?? 'anonymous';

  app.post('/projets', async (request, reply) => {
    const { useCase, statut } = parse(createSchema, request.body);
    const projet = await service.create(actor(request), useCase, statut);
    request.log.info({ projetId: projet.id }, 'projet.created');
    return reply.status(201).send(projet);
  });

  app.get('/projets', async (request) => {
    const q = request.query as { statut?: Statut; mine?: string };
    return service.list({
      ...(q.statut ? { statut: q.statut } : {}),
      ...(q.mine === 'true' ? { proprietaire: actor(request) } : {}),
    });
  });

  app.get('/projets/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.get(id);
  });

  app.patch('/projets/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.patch(id, parse(patchSchema, request.body));
  });
}
