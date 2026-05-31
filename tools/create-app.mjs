#!/usr/bin/env node
/**
 * create-app — scaffold a new GetExp application from a blessed template.
 *
 * Usage:
 *   pnpm create-app --template <api-ts|api-py|web|mobile> --name <kebab-name>
 *                   [--storage postgres,s3]   # override manifest defaults
 *   pnpm create-app                            # interactive
 *
 * What it does:
 *   1. copies templates/<template> into apps/<name>, substituting __APP_NAME__;
 *   2. writes a per-app CLAUDE.md recording the app's tech choices (+ an
 *      override section — the framework is strict but per-app deviation is
 *      allowed with a justification);
 *   3. registers the app in getexp.json.
 *
 * This is the local, minimal equivalent of Spotify Backstage Software Templates.
 */
import { existsSync } from 'node:fs';
import { cp, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = join(root, 'templates');
const manifestPath = join(root, 'getexp.json');
const PLACEHOLDER = '__APP_NAME__';

const COMPONENT_TYPE = {
  'api-ts': 'service',
  'api-py': 'service',
  web: 'website',
  mobile: 'mobile-app',
};
const SUPPORTS_STORAGE = new Set(['api-ts', 'api-py']);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--template') args.template = argv[++i];
    else if (argv[i] === '--name') args.name = argv[++i];
    else if (argv[i] === '--storage') args.storage = argv[++i];
  }
  return args;
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function isValidName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

async function listTemplates() {
  const entries = await readdir(templatesDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { project: 'getexp', usageModel: 'monorepo', defaults: {}, apps: [] };
  }
}

async function writeManifest(manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Recursively replace the placeholder inside every file's contents. */
async function substituteContents(dir, appName) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await substituteContents(full, appName);
    } else {
      const original = await readFile(full, 'utf8');
      if (original.includes(PLACEHOLDER)) {
        await writeFile(full, original.replaceAll(PLACEHOLDER, appName));
      }
    }
  }
}

/** Rename any file/dir whose name contains the placeholder. */
async function substituteNames(dir, appName) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await substituteNames(full, appName);
    if (entry.name.includes(PLACEHOLDER)) {
      await rename(full, join(dir, entry.name.replaceAll(PLACEHOLDER, appName)));
    }
  }
}

function appClaudeMd(name, template, storage) {
  const lines = [
    `# ${name} — app instructions`,
    '',
    'This app follows the GetExp framework doctrine in the **repo-root**',
    '[`CLAUDE.md`](../../CLAUDE.md) — read that first. This file records THIS',
    "app's profile and any per-app overrides.",
    '',
    '## Profile',
    '',
    `- Template: \`${template}\` (type: ${COMPONENT_TYPE[template] ?? 'service'})`,
  ];
  if (SUPPORTS_STORAGE.has(template)) {
    lines.push(
      `- Relational storage: \`${storage.relational ?? 'none'}\` (via the \`Repository\` port)`,
    );
    lines.push(`- Object storage: \`${storage.blob ?? 'none'}\` (via the \`BlobStore\` port)`);
  }
  lines.push(
    '',
    '## Working on this app',
    '',
    '- Import building blocks from `@getexp/core` / `getexp_core`; never re-implement them.',
    '- Model new code on `apps/reference-api-ts` / `apps/reference-api-py`.',
    '- Depend on storage **ports**, not drivers; the adapter is chosen by env URL.',
    '- Keep the gates green (`pnpm check` or the Python equivalents).',
    '',
    '## Overrides (strict + per-app)',
    '',
    'The frozen stack applies by default. To deviate **for this app only**, add a',
    'line below with a one-line justification. Anything not listed MUST follow the',
    'root doctrine.',
    '',
    '- _(none yet)_',
    '',
  );
  return lines.join('\n');
}

async function main() {
  const available = await listTemplates();
  const args = parseArgs(process.argv.slice(2));
  const manifest = await readManifest();

  const template = args.template ?? (await prompt(`Template (${available.join(' | ')}): `));
  if (!available.includes(template)) {
    console.error(`✖ Unknown template "${template}". Available: ${available.join(', ')}`);
    process.exit(1);
  }

  const name = args.name ?? (await prompt('App name (kebab-case): '));
  if (!isValidName(name)) {
    console.error(`✖ Invalid name "${name}". Use kebab-case, e.g. "billing-api".`);
    process.exit(1);
  }

  const dest = join(root, 'apps', name);
  if (existsSync(dest)) {
    console.error(`✖ apps/${name} already exists.`);
    process.exit(1);
  }

  // Resolve storage choices: --storage flag overrides manifest defaults.
  const defaults = manifest.defaults?.storage ?? {};
  const storage = { relational: defaults.relational, blob: defaults.blob };
  if (args.storage) {
    const picks = args.storage.split(',').map((s) => s.trim());
    storage.relational =
      picks.find((p) => ['postgres', 'sqlite', 'none'].includes(p)) ?? storage.relational;
    storage.blob = picks.find((p) => ['s3', 'azblob', 'none'].includes(p)) ?? storage.blob;
  }

  await cp(join(templatesDir, template), dest, { recursive: true });
  await substituteContents(dest, name);
  await substituteNames(dest, name);
  await writeFile(join(dest, 'CLAUDE.md'), appClaudeMd(name, template, storage));

  if (!manifest.apps?.some((a) => a.name === name)) {
    manifest.apps = [...(manifest.apps ?? []), { name, template }];
    await writeManifest(manifest);
  }

  console.log(`\n✓ Created apps/${name} from template "${template}".`);
  console.log(`  - wrote apps/${name}/CLAUDE.md (app profile + overrides)`);
  console.log('  - registered the app in getexp.json\n');
  console.log('Next steps:');
  if (template === 'api-py') {
    console.log('  uv sync --all-packages');
    console.log(`  uv run uvicorn app.main:app --app-dir apps/${name}`);
  } else {
    console.log('  pnpm install');
    console.log(`  pnpm --filter ${name} dev`);
  }
  console.log('\nFollow the patterns in apps/reference-api-* and CLAUDE.md.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
