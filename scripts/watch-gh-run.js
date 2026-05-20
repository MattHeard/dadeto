#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const logPath = resolve(args.logPath);

await mkdir(dirname(logPath), { recursive: true });
await writeFile(logPath, '');

const child = spawn(
  'gh',
  ['run', 'watch', args.runId, '--exit-status', '--interval', String(args.intervalSeconds)],
  {
  stdio: ['ignore', 'pipe', 'pipe'],
  }
);

const failurePatterns = [
  /(^|\s)(error|failed|failure)(\s|$)/i,
  /^X\s+/m,
  /Terraform Apply/i,
  /SyntaxError:/i,
  /ERR_MODULE_NOT_FOUND/i,
];

child.stdout.on('data', chunk => {
  forwardChunk(chunk, process.stdout);
});

child.stderr.on('data', chunk => {
  forwardChunk(chunk, process.stderr);
});

const exitCode = await new Promise(resolve => {
  child.on('close', code => resolve(code ?? 1));
});

process.exitCode = exitCode;

function parseArgs(argv) {
  const parsed = {
    runId: null,
    logPath: 'reports/gh-run-watch.log',
    intervalSeconds: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--log') {
      index += 1;
      parsed.logPath = argv[index];
    } else if (arg.startsWith('--log=')) {
      parsed.logPath = arg.slice('--log='.length);
    } else if (arg === '--interval') {
      index += 1;
      parsed.intervalSeconds = Number(argv[index]);
    } else if (arg.startsWith('--interval=')) {
      parsed.intervalSeconds = Number(arg.slice('--interval='.length));
    } else if (!parsed.runId) {
      parsed.runId = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.runId) {
    throw new Error('Usage: npm run gh:watch -- <run-id> [--log path]');
  }

  if (!Number.isFinite(parsed.intervalSeconds) || parsed.intervalSeconds < 1) {
    parsed.intervalSeconds = 1;
  }

  return parsed;
}

function forwardChunk(chunk, stream) {
  stream.write(chunk);
  appendFile(logPath, chunk).catch(() => {});

  const text = chunk.toString('utf8');
  if (failurePatterns.some(pattern => pattern.test(text))) {
    stream.write('\n[gh:watch] possible failure detected in live output\n');
  }
}
