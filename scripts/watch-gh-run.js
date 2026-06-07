#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

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

const poller = watchForFailures(args.runId, args.intervalSeconds);

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

poller.stop = true;
await poller.done.catch(() => {});

process.exitCode = exitCode;

function parseArgs(argv) {
  const parsed = {
    runId: null,
    logPath: 'reports/gh-run-watch.log',
    intervalSeconds: 10,
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
    parsed.intervalSeconds = 10;
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

function watchForFailures(runId, intervalSeconds) {
  const seen = new Map();
  const result = { stop: false };

  result.done = (async () => {
    while (!result.stop) {
      try {
        const output = await runGhJson([
          'run',
          'view',
          runId,
          '--json',
          'status,conclusion,jobs',
          '--jq',
          '.jobs[] | {name:.name, conclusion:.conclusion, steps:[.steps[] | {name:.name, conclusion:.conclusion}]}',
        ]);

        const jobs = output
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => JSON.parse(line));

        for (const job of jobs) {
          const jobKey = job.name;
          const previous = seen.get(jobKey);
          seen.set(jobKey, job);

          if (!previous) {
            continue;
          }

          const failedStep = job.steps.find((step, index) => {
            const prior = previous.steps[index];
            return step.conclusion === 'failure' && prior?.conclusion !== 'failure';
          });

          if (failedStep) {
            process.stdout.write(
              `\n[gh:watch] failure: ${jobKey} -> ${failedStep.name}\n`
            );
          } else if (job.conclusion === 'failure' && previous.conclusion !== 'failure') {
            process.stdout.write(`\n[gh:watch] failure: ${jobKey} failed\n`);
          } else if (job.conclusion === 'success' && previous.conclusion !== 'success') {
            process.stdout.write(`\n[gh:watch] success: ${jobKey} completed\n`);
          }
        }
      } catch {
        // Keep watching; transient API failures shouldn't hide the run.
      }

      await sleep(intervalSeconds * 1000);
    }
  })();

  return result;
}

async function runGhJson(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `gh exited with ${code}`));
      }
    });
  });
}
