// Agentic Claude loop — "Claude Code style" (ported from the original Express
// backend). The agent has file + bash tools in a per-job isolated workspace and
// builds a self-contained index.html prototype.
//
// Per-app override (see CLAUDE.md): this uses @anthropic-ai/sdk directly rather
// than the framework HttpClient, because the agentic tool-use streaming loop is
// what the official SDK is for; the SDK provides its own timeouts/retries.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.ts';
import type { GenerateResult, UseCase } from './types.ts';

export type GenerateFn = (uc: UseCase, onStep?: (m: string) => void) => Promise<GenerateResult>;

interface ToolInput {
  path?: string;
  content?: string;
  command?: string;
}

const TOOLS = [
  {
    name: 'write_file',
    description: 'Crée ou écrase un fichier dans le workspace (chemin relatif, ex: "index.html").',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin relatif du fichier' },
        content: { type: 'string', description: 'Contenu complet du fichier' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Lit le contenu d’un fichier du workspace (chemin relatif).',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'Liste les fichiers du workspace.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'bash',
    description: 'Exécute une commande shell dans le workspace. Pas d’accès réseau.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
];

/** Prevent any escape from the workspace (path traversal). */
function cheminSur(workspace: string, rel: string): string {
  const p = resolve(workspace, rel);
  if (p !== workspace && !p.startsWith(workspace + sep)) {
    throw new Error(`Chemin hors workspace refusé : ${rel}`);
  }
  return p;
}

function executerOutil(workspace: string, nom: string, input: ToolInput): string {
  switch (nom) {
    case 'write_file': {
      const p = cheminSur(workspace, input.path ?? '');
      mkdirSync(dirname(p), { recursive: true });
      const content = String(input.content ?? '');
      writeFileSync(p, content);
      return `Écrit ${input.path} (${Buffer.byteLength(content)} octets).`;
    }
    case 'read_file': {
      const p = cheminSur(workspace, input.path ?? '');
      if (!existsSync(p)) return `Fichier introuvable : ${input.path}`;
      return readFileSync(p, 'utf8').slice(0, 100000);
    }
    case 'list_files': {
      return (
        execSync('find . -type f -not -path "./node_modules/*"', { cwd: workspace })
          .toString()
          .trim() || '(workspace vide)'
      );
    }
    case 'bash': {
      try {
        const out = execSync(input.command ?? '', {
          cwd: workspace,
          timeout: 15000,
          stdio: ['ignore', 'pipe', 'pipe'],
        }).toString();
        return out.slice(0, 20000) || '(pas de sortie)';
      } catch (e) {
        const err = e as { status?: number; stderr?: Buffer; message?: string };
        const detail = String(err.stderr ?? err.message ?? e).slice(0, 4000);
        return `Erreur (code ${err.status ?? '?'}) : ${detail}`;
      }
    }
    default:
      return `Outil inconnu : ${nom}`;
  }
}

const SYSTEM = `Tu es un designer-développeur front-end de très haut niveau. Tu construis des PROTOTYPES web de démonstration, façon agent autonome.

Objectif : produire un fichier \`index.html\` AUTO-PORTÉ, visuellement bluffant et interactif, qui démontre le produit décrit.

Contraintes sur index.html :
- UN SEUL fichier index.html (HTML + CSS + JS). Les CDN sont autorisés pour la qualité visuelle (Google Fonts, icônes, Tailwind CDN, Chart.js…).
- INTERDIT : appeler une API métier/back-end réelle. Toutes les DONNÉES restent en dur dans le JS (jeu d'exemple réaliste).
- Responsive (mobile d'abord), accessible, sans erreur console.
- Interactions réelles : navigation, filtres, formulaires, états. Contenu métier crédible, jamais de Lorem ipsum.

Méthode :
1. Écris index.html avec write_file.
2. VÉRIFIE avec read_file/bash (sections clés, taille, aucune URL d'API métier).
3. Fais au moins une passe d'amélioration visuelle.
4. Quand le prototype est soigné et vérifié, réponds UNIQUEMENT : PROTOTYPE_READY

Ne demande jamais de précision : prends des décisions de design fortes et avance.`;

function buildPrompt(uc: UseCase): string {
  const spec = uc.spec ?? {};
  const remarques = (uc.remarques ?? [])
    .map((r) => (typeof r === 'string' ? r : r.texte))
    .filter(Boolean);
  const blocRemarques = remarques.length
    ? `\n\nREMARQUES DU CLIENT À INTÉGRER EN PRIORITÉ :\n${remarques.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';
  return `Construis le prototype index.html pour ce projet :

TITRE : ${uc.titre}
DOMAINE : ${uc.domaine ?? ''}
PROBLÈME : ${uc.probleme ?? ''}
OBJECTIF : ${uc.objectif ?? ''}
UTILISATEURS : ${uc.utilisateurs ?? ''}
APPROCHE : ${uc.approcheSuggeree ?? ''}
KPIS : ${(uc.kpis ?? []).join(', ')}
${(uc.langues ?? []).length ? `LANGUES : ${(uc.langues ?? []).join(', ')}` : ''}
${spec.resume ? `RÉSUMÉ : ${spec.resume}` : ''}
${spec.fonctionnalites ? `FONCTIONNALITÉS : ${spec.fonctionnalites.join(' ; ')}` : ''}
${spec.donneesEntree ? `DONNÉES : ${spec.donneesEntree}` : ''}${blocRemarques}

Commence maintenant.`;
}

const MAX_TOURS = 20;

/** Run the agentic loop for one use case. Returns { html, journal } or throws. */
export const generatePrototype: GenerateFn = async (uc, onStep = () => {}) => {
  const client = new Anthropic();
  const workspace = mkdtempSync(join(tmpdir(), 'getexp-'));
  const journal: string[] = [];
  const log = (m: string) => {
    journal.push(m);
    onStep(m);
  };

  try {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildPrompt(uc) }];

    for (let tour = 0; tour < MAX_TOURS; tour++) {
      // Streaming is required with a large max_tokens + reasoning effort.
      const params = {
        model: config.ANTHROPIC_MODEL,
        max_tokens: 48000,
        thinking: { type: 'adaptive' },
        output_config: { effort: config.ANTHROPIC_EFFORT },
        system: SYSTEM,
        tools: TOOLS,
        messages,
      };
      const stream = client.messages.stream(
        params as unknown as Parameters<typeof client.messages.stream>[0],
      );
      const reponse = await stream.finalMessage();
      messages.push({ role: 'assistant', content: reponse.content });

      const textes = reponse.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join(' ')
        .trim();
      if (textes) log(`💬 ${textes.slice(0, 120)}`);

      const toolUses = reponse.content.flatMap((b) => (b.type === 'tool_use' ? [b] : []));

      if (reponse.stop_reason === 'end_turn' || textes.includes('PROTOTYPE_READY')) {
        if (toolUses.length === 0) break;
      }
      if (toolUses.length === 0) {
        if (reponse.stop_reason === 'end_turn') break;
        continue;
      }

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const ti = tu.input as ToolInput;
        log(`🔧 ${tu.name}${ti.path ? ` ${ti.path}` : ''}${ti.command ? ` ${ti.command}` : ''}`);
        let out: string;
        try {
          out = executerOutil(workspace, tu.name, ti);
        } catch (e) {
          out = `Erreur : ${e instanceof Error ? e.message : String(e)}`;
        }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
      }
      messages.push({ role: 'user', content: results });
    }

    const indexPath = join(workspace, 'index.html');
    if (!existsSync(indexPath)) {
      throw new Error("L'agent n'a pas produit de fichier index.html.");
    }
    const html = readFileSync(indexPath, 'utf8');
    log(`✅ Prototype généré (${Buffer.byteLength(html)} octets).`);
    return { html, journal };
  } finally {
    try {
      rmSync(workspace, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
};
