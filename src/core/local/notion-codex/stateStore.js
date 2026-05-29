import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  asNullableString,
  asStringWithFallback,
  isObjectLike,
  toSourceObject,
} from './valueHelpers.js';

/**
 * @param {unknown} value Candidate run object.
 * @returns {Record<string, unknown> | null} Active run object or null.
 */
export function normalizeActiveRun(value) {
  if (isObjectLike(value)) {
    return value;
  }

  return null;
}

/**
 * @param {unknown} value Candidate integer.
 * @returns {number | null} Integer or null.
 */
function asNullableInteger(value) {
  if (!Number.isInteger(value)) {
    return null;
  }

  return /** @type {number} */ (value);
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
 * @param {unknown} error Candidate filesystem error.
 * @returns {string | null} Error code or null.
 */
function readErrorCode(error) {
  if (isObjectLike(error)) {
    return asNullableString(error.code);
  }

  return null;
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
 * @param {{
 *   statePath: string,
 *   mkdirImpl?: typeof mkdir,
 *   readFileImpl?: typeof readFile,
 *   writeFileImpl?: typeof writeFile
 * }} options Store dependencies.
 * @returns {{
 *   mkdirImpl: typeof mkdir,
 *   readFileImpl: typeof readFile,
 *   writeFileImpl: typeof writeFile,
 *   readStatePath: string
 * }} Resolved store dependencies.
 */
function resolveStoreDeps(options) {
  return {
    mkdirImpl: resolveDependency(options.mkdirImpl, mkdir),
    readFileImpl: resolveDependency(options.readFileImpl, readFile),
    writeFileImpl: resolveDependency(options.writeFileImpl, writeFile),
    readStatePath: options.statePath,
  };
}

/**
 * @param {{
 *   readFileImpl: typeof readFile,
 *   readStatePath: string
 * }} options Read state dependencies.
 * @returns {() => Promise<Record<string, unknown>>} Reader for persisted state.
 */
function createReadState({ readFileImpl, readStatePath }) {
  return async () => readStateFromFile({ readFileImpl, readStatePath });
}

/**
 * @param {{
 *   readFileImpl: typeof readFile,
 *   readStatePath: string
 * }} options Read state dependencies.
 * @returns {Promise<Record<string, unknown>>} Parsed state or defaults.
 */
async function readStateFromFile({ readFileImpl, readStatePath }) {
  try {
    const rawState = await readFileImpl(readStatePath, 'utf8');
    return normalizeNotionCodexState(JSON.parse(rawState));
  } catch (error) {
    return readStateErrorFallback(error);
  }
}

/**
 * @param {unknown} error Candidate read failure.
 * @returns {Record<string, unknown>} Normalized fallback state.
 */
function readStateErrorFallback(error) {
  if (!isMissingStateError(error)) {
    throw error;
  }

  return normalizeNotionCodexState(null);
}

/**
 * @param {{
 *   mkdirImpl: typeof mkdir,
 *   writeFileImpl: typeof writeFile,
 *   readStatePath: string
 * }} options Write state dependencies.
 * @returns {(state: Record<string, unknown>) => Promise<void>} Writer for persisted state.
 */
function createWriteState({ mkdirImpl, writeFileImpl, readStatePath }) {
  return async state => {
    await mkdirImpl(path.dirname(readStatePath), { recursive: true });
    const normalizedState = normalizeNotionCodexState(state);
    const serializedState = JSON.stringify(normalizedState, null, 2);
    await writeFileImpl(readStatePath, serializedState, 'utf8');
  };
}

/**
 * @template T
 * @param {T | undefined} value Candidate dependency.
 * @param {T} fallback Default dependency.
 * @returns {T} Resolved dependency.
 */
function resolveDependency(value, fallback) {
  return value ?? fallback;
}
