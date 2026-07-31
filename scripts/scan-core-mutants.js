import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve('.');
const statePath = path.join(root, 'reports/mutation/core-file-scan.jsonl');
const survivorListPath = path.join(
  root,
  'reports/mutation/core-files-with-surviving-mutants.json'
);
const mutationReportPath = path.join(root, 'reports/mutation/mutation.json');
const perFileTimeoutMs = Number(process.env.CORE_MUTANT_TIMEOUT_MS || 120000);

async function filesUnder(directory) {
  const entries = await (await import('node:fs/promises')).readdir(directory, {
    withFileTypes: true,
  });
  const result = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(fullPath)));
    else if (/\.(?:js|mjs)$/.test(entry.name)) result.push(fullPath);
  }
  return result.sort();
}

async function latestResults() {
  try {
    const lines = (await readFile(statePath, 'utf8')).trim().split('\n');
    return new Map(
      lines.filter(Boolean).map(line => {
        const record = JSON.parse(line);
        return [record.file, record];
      })
    );
  } catch {
    return new Map();
  }
}

async function record(value) {
  await appendFile(statePath, `${JSON.stringify(value)}\n`);
}

function run(file) {
  return new Promise(resolve => {
    const child = spawn(
      'timeout',
      [
        '--foreground',
        '--signal=INT',
        '--kill-after=5s',
        `${Math.ceil(perFileTimeoutMs / 1000)}s`,
        'npm',
        'run',
        'mutant:worktree',
        '--',
        file,
      ],
      {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, BEADS_NO_DAEMON: '1' },
      }
    );
    child.once('error', error => resolve({ code: null, error: error.message }));
    child.once('exit', code => {
      resolve({
        code,
        error:
          code === 124 || code === 137
            ? `Timed out after ${perFileTimeoutMs}ms`
            : null,
      });
    });
  });
}

async function survivors() {
  try {
    const report = JSON.parse(await readFile(mutationReportPath, 'utf8'));
    const mutants = Object.values(report.files ?? {}).flatMap(file =>
      Object.values(file.mutants ?? {})
    );
    return mutants.filter(mutant => mutant.status === 'Survived').length;
  } catch {
    return null;
  }
}

await mkdir(path.dirname(statePath), { recursive: true });
const state = await latestResults();
const files = await filesUnder(path.join(root, 'src/core'));
console.log(`Scanning ${files.length} JavaScript files under src/core`);

for (const absoluteFile of files) {
  const file = path.relative(root, absoluteFile);
  if (state.get(file)?.status) continue;
  await record({ type: 'start', file, at: new Date().toISOString() });
  const result = await run(file);
  const survivorCount = result.code === 0 ? await survivors() : null;
  const finalRecord = {
    type: 'result',
    file,
    status: result.code === 0 ? 'success' : 'failed',
    exitCode: result.code,
    error: result.error,
    survivingMutants: survivorCount,
    at: new Date().toISOString(),
  };
  await record(finalRecord);
  state.set(file, finalRecord);
  await writeFile(
    survivorListPath,
    `${JSON.stringify(
      [...state.values()]
        .filter(
          value =>
            value.status === 'success' &&
            Number.isInteger(value.survivingMutants) &&
            value.survivingMutants > 0
        )
        .map(value => ({ file: value.file, survivingMutants: value.survivingMutants })),
      null,
      2
    )}\n`
  );
  if (result.code !== 0) console.error(`Mutation run failed for ${file}`);
}

console.log(`Finished. Results persisted in ${path.relative(root, statePath)}`);
