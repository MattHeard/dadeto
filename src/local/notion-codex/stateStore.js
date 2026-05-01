import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {unknown} value Candidate run object.
 * @returns {Record<string, unknown> | null} Active run object or null.
 */
function normalizeActiveRun(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate state.
 * @returns {Record<string, unknown>} Normalized poller state.
 */
export function normalizeNotionCodexState(value) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    version: 1,
    lastPollAt: typeof source.lastPollAt === 'string' ? source.lastPollAt : null,
    lastOutcome: typeof source.lastOutcome === 'string' ? source.lastOutcome : 'idle',
    lastSummary: typeof source.lastSummary === 'string' ? source.lastSummary : '',
    idleBackoffExponent: Number.isInteger(source.idleBackoffExponent)
      ? source.idleBackoffExponent
      : null,
    nextPollAfter: typeof source.nextPollAfter === 'string'
      ? source.nextPollAfter
      : null,
    activeRun: normalizeActiveRun(source.activeRun),
    eventLog: Array.isArray(source.eventLog) ? source.eventLog.slice(-20) : [],
  };
}

/**
 * @param {{
 *   statePath: string,
 *   mkdirImpl?: typeof mkdir,
 *   readFileImpl?: typeof readFile,
 *   writeFileImpl?: typeof writeFile
 * }} options Store dependencies.
 * @returns {{
 *   readState: () => Promise<Record<string, unknown>>,
 *   writeState: (state: Record<string, unknown>) => Promise<void>
 * }} JSON state store.
 */
export function createNotionCodexStateStore(options) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const readFileImpl = options.readFileImpl ?? readFile;
  const writeFileImpl = options.writeFileImpl ?? writeFile;

  return {
    async readState() {
      try {
        const rawState = await readFileImpl(options.statePath, 'utf8');
        return normalizeNotionCodexState(JSON.parse(rawState));
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
          return normalizeNotionCodexState(null);
        }

        throw error;
      }
    },

    async writeState(state) {
      await mkdirImpl(path.dirname(options.statePath), { recursive: true });
      await writeFileImpl(
        options.statePath,
        JSON.stringify(normalizeNotionCodexState(state), null, 2),
        'utf8'
      );
    },
  };
}
