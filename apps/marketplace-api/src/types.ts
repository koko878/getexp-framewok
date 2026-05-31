import { z } from 'zod';

/** Subset of the marketplace UseCase needed to brief the prototype agent. */
export const useCaseSpecSchema = z.object({
  resume: z.string().optional(),
  fonctionnalites: z.array(z.string()).optional(),
  donneesEntree: z.string().optional(),
});

export const useCaseSchema = z.object({
  titre: z.string().min(1),
  domaine: z.string().optional(),
  probleme: z.string().optional(),
  objectif: z.string().optional(),
  utilisateurs: z.string().optional(),
  approcheSuggeree: z.string().optional(),
  kpis: z.array(z.string()).optional(),
  langues: z.array(z.string()).optional(),
  spec: useCaseSpecSchema.optional(),
  remarques: z.array(z.union([z.string(), z.object({ texte: z.string() })])).optional(),
});

export type UseCase = z.infer<typeof useCaseSchema>;

export interface GenerateResult {
  html: string;
  journal: string[];
}
