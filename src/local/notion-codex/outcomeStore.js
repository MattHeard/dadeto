import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {unknown} value Candidate outcome payload.
 * @returns {{ outcome: string, summary: string }} Normalized outcome.
 */
export function normalizeNotionCodexOutcome(value) {
  const source = value && typeof value === 'object' ? value : {};
  const outcome = typeof source.outcome === 'string' ? source.outcome : 'unknown';
  const summary = typeof source.summary === 'string' ? source.summary : '';

  return { outcome, summary };
}

/**
 * @param {{
 *   outcomeDir: string,
 *   mkdirImpl?: typeof mkdir,
 *   readFileImpl?: typeof readFile,
 *   writeFileImpl?: typeof writeFile
 * }} options Store dependencies.
 * @returns {{
 *   readOutcome: (runId: string) => Promise<{ outcome: string, summary: string } | null>,
 *   writeOutcome: (runId: string, outcome: Record<string, unknown>) => Promise<void>
 * }} Outcome store.
 */
export function createNotionCodexOutcomeStore(options) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const readFileImpl = options.readFileImpl ?? readFile;
  const writeFileImpl = options.writeFileImpl ?? writeFile;

  return {
    async readOutcome(runId) {
      try {
        const rawOutcome = await readFileImpl(getOutcomePath(options.outcomeDir, runId), 'utf8');
        return normalizeNotionCodexOutcome(JSON.parse(rawOutcome));
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
          return null;
        }

        throw error;
      }
    },

    async writeOutcome(runId, outcome) {
      await mkdirImpl(options.outcomeDir, { recursive: true });
      await writeFileImpl(
        getOutcomePath(options.outcomeDir, runId),
        JSON.stringify(normalizeNotionCodexOutcome(outcome), null, 2),
        'utf8'
      );
    },
  };
}

function getOutcomePath(outcomeDir, runId) {
  return path.join(outcomeDir, `${runId.replaceAll(':', '-')}.json`);
}
