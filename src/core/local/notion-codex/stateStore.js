import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {unknown} value Candidate run object.
 * @returns {Record<string, unknown> | null} Active run object or null.
 */
export function normalizeActiveRun(value) {
  if (!value) {
    return null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate source.
 * @returns {Record<string, unknown>} Source object or empty object.
 */
function toSourceObject(value) {
  if (!value) {
    return {};
  }

  if (typeof value !== 'object') {
    return {};
  }

  return value;
}

/**
 * @param {unknown} value Candidate string.
 * @returns {string | null} String or null.
 */
function asNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Fallback value.
 * @returns {string} String or fallback.
 */
function asStringWithFallback(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate integer.
 * @returns {number | null} Integer or null.
 */
function asNullableInteger(value) {
  if (!Number.isInteger(value)) {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate list.
 * @returns {Array<unknown>} Latest event entries.
 */
function asEventLog(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(-20);
}

/**
 * @param {unknown} value Candidate state.
 * @returns {Record<string, unknown>} Normalized poller state.
 */
export function normalizeNotionCodexState(value) {
  const source = toSourceObject(value);

  return {
    version: 1,
    lastPollAt: asNullableString(source.lastPollAt),
    lastOutcome: asStringWithFallback(source.lastOutcome, 'idle'),
    lastSummary: asStringWithFallback(source.lastSummary, ''),
    idleBackoffExponent: asNullableInteger(source.idleBackoffExponent),
    nextPollAfter: asNullableString(source.nextPollAfter),
    activeRun: normalizeActiveRun(source.activeRun),
    eventLog: asEventLog(source.eventLog),
  };
}

/**
 *
 * @param error
 */
function isMissingStateError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 'ENOENT');
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
        if (isMissingStateError(error)) {
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
