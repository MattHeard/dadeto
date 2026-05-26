import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {unknown} value Candidate run object.
 * @returns {Record<string, unknown> | null} Active run object or null.
 */
export function normalizeActiveRun(value) {
  if (typeof value !== 'object' || !value) {
    return null;
  }

  return value;
}

/**
 * @param {unknown} value Candidate source.
 * @returns {Record<string, unknown>} Source object or empty object.
 */
function toSourceObject(value) {
  if (typeof value !== 'object' || !value) {
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
 * @param {unknown} error Candidate filesystem error.
 * @returns {boolean} True when the error is a missing-file read.
 */
function isMissingStateError(error) {
  return readErrorCode(error) === 'ENOENT';
}

/**
 *
 * @param error
 */
function readErrorCode(error) {
  if (typeof error !== 'object' || !error) {
    return null;
  }

  return error.code;
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
  const { mkdirImpl, readFileImpl, writeFileImpl, readStatePath } =
    resolveStoreDeps(options);

  /**
   * @returns {Promise<Record<string, unknown>>} Parsed state or defaults.
   */
  const readState = createReadState({ readFileImpl, readStatePath });
  const writeState = createWriteState({
    mkdirImpl,
    writeFileImpl,
    readStatePath,
  });

  return {
    readState,
    writeState,
  };
}

/**
 *
 * @param options
 */
function resolveStoreDeps(options) {
  return {
    mkdirImpl: options.mkdirImpl ?? mkdir,
    readFileImpl: options.readFileImpl ?? readFile,
    writeFileImpl: options.writeFileImpl ?? writeFile,
    readStatePath: options.statePath,
  };
}

/**
 *
 * @param root0
 * @param root0.readFileImpl
 * @param root0.readStatePath
 */
function createReadState({ readFileImpl, readStatePath }) {
  return async () => {
    try {
      const rawState = await readFileImpl(readStatePath, 'utf8');
      return normalizeNotionCodexState(JSON.parse(rawState));
    } catch (error) {
      if (!isMissingStateError(error)) {
        throw error;
      }

      return normalizeNotionCodexState(null);
    }
  };
}

/**
 *
 * @param root0
 * @param root0.mkdirImpl
 * @param root0.writeFileImpl
 * @param root0.readStatePath
 */
function createWriteState({ mkdirImpl, writeFileImpl, readStatePath }) {
  return async state => {
    await mkdirImpl(path.dirname(readStatePath), { recursive: true });
    const normalizedState = normalizeNotionCodexState(state);
    const serializedState = JSON.stringify(normalizedState, null, 2);
    await writeFileImpl(readStatePath, serializedState, 'utf8');
  };
}
