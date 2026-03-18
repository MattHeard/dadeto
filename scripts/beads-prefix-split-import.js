#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    root: process.env.BEADS_HOME || join(process.env.HOME || '', '.beads'),
    jsonl: null,
    prefixes: ['gm', 'mh', 'dadeto'],
    apply: false,
    backup: true,
    dryRun: false,
    setCustomTypes: true,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--no-backup') args.backup = false;
    else if (arg === '--no-custom-types') args.setCustomTypes = false;
    else if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length);
    else if (arg === '--root') args.root = argv[++i];
    else if (arg.startsWith('--jsonl=')) args.jsonl = arg.slice('--jsonl='.length);
    else if (arg === '--jsonl') args.jsonl = argv[++i];
    else if (arg.startsWith('--prefixes=')) args.prefixes = arg.slice('--prefixes='.length).split(',').filter(Boolean);
    else if (arg === '--prefixes') args.prefixes = argv[++i].split(',').filter(Boolean);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.jsonl) {
    args.jsonl = join(args.root, 'issues.jsonl');
  }

  return args;
}

function prefixOf(issueId) {
  const match = String(issueId).match(/^([^-]+)-/);
  return match ? match[1] : null;
}

async function splitJsonlByPrefix(jsonlPath, prefixes, outDir) {
  const text = await readFile(jsonlPath, 'utf8');
  const buckets = new Map(prefixes.map((prefix) => [prefix, []]));
  const extras = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const record = JSON.parse(trimmed);
    const prefix = prefixOf(record.id);
    if (!prefix || !buckets.has(prefix)) {
      extras.push(trimmed);
      continue;
    }
    buckets.get(prefix).push(trimmed);
  }

  await mkdir(outDir, { recursive: true });
  const outputs = [];
  for (const [prefix, lines] of buckets.entries()) {
    const out = join(outDir, `${prefix}.jsonl`);
    await writeFile(out, `${lines.join('\n')}${lines.length ? '\n' : ''}`);
    outputs.push({ prefix, path: out, count: lines.length });
  }
  const extrasPath = join(outDir, 'unmatched.jsonl');
  await writeFile(extrasPath, `${extras.join('\n')}${extras.length ? '\n' : ''}`);
  return { outputs, extrasPath, extrasCount: extras.length };
}

function runBd(root, args) {
  execFileSync('bd', args, { cwd: root, stdio: 'inherit' });
}

async function main() {
  const options = parseArgs(process.argv);
  const backupDir = `${options.root}.bak`;
  const workDir = join(options.root, '.prefix-import');

  if (options.backup) {
    await rm(backupDir, { recursive: true, force: true });
    await cp(options.root, backupDir, { recursive: true });
  }

  const split = await splitJsonlByPrefix(options.jsonl, options.prefixes, workDir);
  console.log(JSON.stringify({
    root: options.root,
    jsonl: options.jsonl,
    backup: options.backup ? backupDir : null,
    dryRun: options.dryRun || !options.apply,
    shards: split.outputs,
    unmatched: split.extrasCount,
    unmatchedPath: split.extrasPath,
  }, null, 2));

  if (!options.apply) return;

  if (options.setCustomTypes) {
    runBd(options.root, ['config', 'set', 'types.custom', 'subtask']);
  }

  for (const shard of split.outputs) {
    runBd(options.root, ['config', 'set', 'issue-prefix', shard.prefix]);
    runBd(options.root, ['import', '-i', shard.path]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
