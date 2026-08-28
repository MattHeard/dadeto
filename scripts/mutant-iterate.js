import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { scanCoreMutants } from './scan-core-mutants.js';

/**
 * Run the resumable per-file src/core mutation sweep.
 *
 * The scanner stores terminal state in reports/mutation/core-file-scan.jsonl,
 * so interrupted runs can be restarted without repeating successful files.
 * @returns {Promise<void>} Resolves after the sweep completes.
 */
export async function runMutantIteration() {
  process.env.STRYKER_CONCURRENCY ||= '4';
  process.env.STRYKER_TIMEOUT_MS ||= '30000';
  const timeoutMs = Number(
    process.env.CORE_MUTANT_TIMEOUT_MS || 60 * 60 * 1000
  );
  const rootDir = path.resolve(process.env.DADETO_MUTANT_ROOT || '.');
  const summary = await scanCoreMutants({
    rootDir,
    timeoutMs,
    findTests: true,
    refreshSurvivors: true,
  });
  console.log(
    `Mutant iteration complete: ${summary.completed}/${summary.total} files, ` +
      `${summary.pending} pending, ${summary.survivors} with survivors, ` +
      `${summary.timedOut} timed out, ${summary.failed} failed.`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await runMutantIteration();
}
