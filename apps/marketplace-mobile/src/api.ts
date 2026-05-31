// Thin client for marketplace-api. The mobile UI calls its own backend with
// fetch (the resilient HttpClient lives server-side, in @getexp/core).
const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export interface UseCase {
  titre: string;
  domaine?: string;
  probleme?: string;
  objectif?: string;
  utilisateurs?: string;
}

export type Statut =
  | 'brouillon'
  | 'soumis'
  | 'prototype_pret_admin'
  | 'prototype_genere'
  | 'revision_demandee'
  | 'prototype_valide'
  | 'cadrage_technique'
  | 'pret_a_packager'
  | 'certifie';

export interface Projet {
  id: string;
  proprietaire: string;
  donnees: UseCase;
  statut: Statut;
  creeLe: string;
  majLe: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-actor': 'demo', ...init?.headers },
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(problem.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProjets: () => req<Projet[]>('/projets'),
  createProjet: (useCase: UseCase, statut: Statut) =>
    req<Projet>('/projets', { method: 'POST', body: JSON.stringify({ useCase, statut }) }),
  getProjet: (id: string) => req<Projet>(`/projets/${id}`),
  setStatut: (id: string, statut: Statut) =>
    req<Projet>(`/projets/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) }),
  generate: (useCase: UseCase) =>
    req<{ html: string; journal: string[] }>('/generate', {
      method: 'POST',
      body: JSON.stringify({ useCase }),
    }),
};
