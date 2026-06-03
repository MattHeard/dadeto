// @ts-nocheck
/* eslint-disable no-ternary, jsdoc/require-returns */
/**
 * @param {unknown} value Candidate outcome payload.
 * @returns {{ outcome: string, summary: string }} Normalized outcome.
 */
export function normalizeNotionCodexOutcome(value) {
  const source = value && typeof value === 'object' ? value : {};
  const record = /** @type {Record<string, unknown>} */ (source);
  const outcome =
    typeof record.outcome === 'string' ? record.outcome : 'unknown';
  const summary = typeof record.summary === 'string' ? record.summary : '';

  return { outcome, summary };
}

/**
 * @param {{
 *   outcomeDir: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>
 * }} options Store dependencies.
 * @returns {{
 *   readOutcome: (runId: string) => Promise<{ outcome: string, summary: string } | null>,
 *   writeOutcome: (runId: string, outcome: Record<string, unknown>) => Promise<void>
 * }} Outcome store.
 */
export function createNotionCodexOutcomeStore(options) {
  const mkdirImpl = options.mkdirImpl;
  const readFileImpl = options.readFileImpl;
  const writeFileImpl = options.writeFileImpl;

  return {
    async readOutcome(runId) {
      try {
        const rawOutcome = await readFileImpl(
          getOutcomePath(options.outcomeDir, runId, options.pathModule),
          'utf8'
        );
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
        getOutcomePath(options.outcomeDir, runId, options.pathModule),
        JSON.stringify(normalizeNotionCodexOutcome(outcome), null, 2),
        'utf8'
      );
    },
  };
}

/**
 *
 * @param {string} outcomeDir Outcome directory.
 * @param {string} runId Run id.
 * @param {{ join: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 */
function getOutcomePath(outcomeDir, runId, pathModule) {
  return pathModule.join(outcomeDir, `${runId.replaceAll(':', '-')}.json`);
}
