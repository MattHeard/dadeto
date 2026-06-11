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
  let activeRun = null;
  if (isObjectLike(value)) {
    activeRun = value;
  }

  return activeRun;
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
 *   pathModule: { dirname: (input: string) => string },
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>
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
    pathModule: options.pathModule,
  });

  return {
    readState,
    writeState,
  };
}

/**
 * @param {{
 *   statePath: string,
 *   pathModule: { dirname: (input: string) => string },
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>
 * }} options Store dependencies.
 * @returns {{
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>,
 *   pathModule: { dirname: (input: string) => string },
 *   readStatePath: string
 * }} Resolved store dependencies.
 */
function resolveStoreDeps(options) {
  return {
    mkdirImpl: options.mkdirImpl,
    readFileImpl: options.readFileImpl,
    writeFileImpl: options.writeFileImpl,
    readStatePath: options.statePath,
    pathModule: options.pathModule,
  };
}

/**
 * @param {{
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   readStatePath: string
 * }} options Read state dependencies.
 * @returns {() => Promise<Record<string, unknown>>} Reader for persisted state.
 */
function createReadState({ readFileImpl, readStatePath }) {
  return async () => readStateFromFile({ readFileImpl, readStatePath });
}

/**
 * @param {{
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
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
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>,
 *   pathModule: { dirname: (input: string) => string },
 *   readStatePath: string
 * }} options Write state dependencies.
 * @returns {(state: Record<string, unknown>) => Promise<void>} Writer for persisted state.
 */
function createWriteState({
  mkdirImpl,
  writeFileImpl,
  readStatePath,
  pathModule,
}) {
  return async state => {
    await mkdirImpl(pathModule.dirname(readStatePath), { recursive: true });
    const normalizedState = normalizeNotionCodexState(state);
    const serializedState = JSON.stringify(normalizedState, null, 2);
    await writeFileImpl(readStatePath, serializedState, 'utf8');
  };
}
