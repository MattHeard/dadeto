#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const logPath = resolve(args.logPath);

await mkdir(dirname(logPath), { recursive: true });
await writeFile(logPath, '');

const child = spawn('gh', ['run', 'watch', args.runId, '--exit-status'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  appendFile(logPath, chunk).catch(() => {});
});

child.stderr.on('data', chunk => {
  process.stderr.write(chunk);
  appendFile(logPath, chunk).catch(() => {});
});

const exitCode = await new Promise(resolve => {
  child.on('close', code => resolve(code ?? 1));
});

process.exitCode = exitCode;

function parseArgs(argv) {
  const parsed = {
    runId: null,
    logPath: 'reports/gh-run-watch.log',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--log') {
      index += 1;
      parsed.logPath = argv[index];
    } else if (arg.startsWith('--log=')) {
      parsed.logPath = arg.slice('--log='.length);
    } else if (!parsed.runId) {
      parsed.runId = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.runId) {
    throw new Error('Usage: npm run gh:watch -- <run-id> [--log path]');
  }

  return parsed;
}
