#!/usr/bin/env node
/**
 * create-app — scaffold a new GetExp application from a blessed template.
 *
 * Usage:
 *   pnpm create-app --template <api-ts|api-py|web|mobile> --name <kebab-name>
 *   pnpm create-app                      # interactive
 *
 * Copies templates/<template> into the right destination, replacing the
 * __APP_NAME__ placeholder in file contents and file/dir names. This is the
 * local, minimal equivalent of Spotify Backstage's Software Templates.
 */
import { existsSync } from 'node:fs';
import { cp, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = join(root, 'templates');
const PLACEHOLDER = '__APP_NAME__';

// api/web/mobile templates all land under apps/.
const DESTINATIONS = {
  'api-ts': 'apps',
  'api-py': 'apps',
  web: 'apps',
  mobile: 'apps',
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--template') args.template = argv[++i];
    else if (argv[i] === '--name') args.name = argv[++i];
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

async function main() {
  const available = await listTemplates();
  const args = parseArgs(process.argv.slice(2));

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

  const destBase = DESTINATIONS[template] ?? 'apps';
  const dest = join(root, destBase, name);
  if (existsSync(dest)) {
    console.error(`✖ ${destBase}/${name} already exists.`);
    process.exit(1);
  }

  await cp(join(templatesDir, template), dest, { recursive: true });
  await substituteContents(dest, name);
  await substituteNames(dest, name);

  console.log(`\n✓ Created ${destBase}/${name} from template "${template}".\n`);
  console.log('Next steps:');
  if (template === 'api-py') {
    console.log('  uv sync --all-packages');
    console.log(`  uv run uvicorn app.main:app --app-dir ${destBase}/${name}`);
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
