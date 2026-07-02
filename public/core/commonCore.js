/**
 * UID for the admin user with elevated access.
 */
export const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

/**
 * Checks if a string is non-empty.
 * @param {unknown} str - Candidate string to validate.
 * @returns {boolean} True when the input is a non-empty string.
 */
export function isValidString(str) {
  return typeof str === 'string' && str.length > 0;
}

/**
 * Detects whether a value is `null` or `undefined`.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the input is nullish.
 */
export function isNullish(value) {
  return value === undefined || value === null;
}

/**
 * Return the array candidate when available; otherwise return an empty array.
 * @param {unknown} value Candidate value.
 * @returns {unknown[]} Array candidate or empty array.
 */
export function arrayOrEmpty(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

/**
 * Parse JSON and return null on failure.
 * @param {string} value Raw JSON string.
 * @returns {unknown} Parsed JSON value or null.
 */
export function parseJsonOrNull(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Ensure a path module is available.
 * @param {{
 *   join?: (...segments: string[]) => string,
 *   resolve?: (...segments: string[]) => string,
 *   relative?: (from: string, to: string) => string,
 *   sep?: string,
 * } | null | undefined} pathModule Path module candidate.
 * @returns {{
 *   join: (...segments: string[]) => string,
 *   resolve: (...segments: string[]) => string,
 *   relative: (from: string, to: string) => string,
 *   sep: string,
 * }} Required path module.
 */
export function requirePathModule(pathModule) {
  if (!pathModule) {
    throw new Error('pathModule is required.');
  }

  return /** @type {any} */ (pathModule);
}

/**
 * Normalize a possibly missing numeric value.
 * @param {number | null | undefined} value Maybe-present number.
 * @returns {number | null} Normalized numeric value.
 */
export function normalizeMaybeNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  return null;
}

/**
 * @param {unknown} value Candidate object value.
 * @returns {Record<string, unknown> | null} Object value or null.
 */
export function getRecordOrNull(value) {
  if (value && typeof value === 'object') {
    return /** @type {Record<string, unknown>} */ (value);
  }

  return null;
}

/**
 * @param {...(string | null)} values Candidate strings.
 * @returns {string[]} Defined string values.
 */
export function getDefinedStrings(...values) {
  return values.filter(value => typeof value === 'string');
}

/**
 * Report failures and set a non-zero exit code when needed.
 * @param {{
 *   failures: string[],
 *   output: { error: (line: string) => void },
 *   setExitCode: (exitCode: number) => void,
 }} options Failure reporting dependencies.
 * @returns {boolean} True when failures were reported.
 */
export function reportFailuresAndExit({ failures, output, setExitCode }) {
  if (failures.length === 0) {
    return false;
  }

  failures.forEach(failure => {
    output.error(failure);
  });
  setExitCode(1);
  return true;
}

/**
 * Report failures or log a success message when the check passes.
 * @param {{
 *   failures: string[],
 *   output: { error: (line: string) => void, log: (line: string) => void },
 *   setExitCode: (exitCode: number) => void,
 *   successMessage: string,
 * }} options Check outcome dependencies.
 * @returns {boolean} True when failures were reported.
 */
export function reportFailuresAndMaybeLogSuccess({
  failures,
  output,
  setExitCode,
  successMessage,
}) {
  if (reportFailuresAndExit({ failures, output, setExitCode })) {
    return true;
  }

  output.log(successMessage);
  return false;
}

/**
 * Check whether a value is a non-empty string.
 * @param {unknown} candidate Candidate value.
 * @returns {candidate is string} True when the candidate is a non-empty string.
 */
export function isNonEmptyString(candidate) {
  return typeof candidate === 'string' && Boolean(candidate.trim());
}

/**
 * Resolve a string fallback.
 * @param {unknown} candidate Candidate value.
 * @param {string} fallback Fallback value.
 * @returns {string} Candidate or fallback.
 */
export function stringOr(candidate, fallback) {
  if (!isNonEmptyString(candidate)) {
    return fallback;
  }

  return candidate;
}

/**
 * Resolve the first non-empty string from a candidate value.
 * @param {unknown} candidate Candidate string or string array.
 * @returns {string | null} First non-empty string, or null when missing.
 */
export function firstStringOrNull(candidate) {
  if (typeof candidate === 'string') {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
    return null;
  }

  if (Array.isArray(candidate)) {
    const [first] = candidate;
    return firstStringOrNull(first);
  }

  return null;
}

/**
 * Return the string candidate when available.
 * @param {unknown} value Candidate value.
 * @returns {string | undefined} String when provided, otherwise undefined.
 */
export function getStringCandidate(value) {
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

/**
 * Normalize a candidate string value.
 * @param {unknown} value Candidate value.
 * @returns {string | null} String value when present, otherwise null.
 */
export function stringOrNull(value) {
  return /** @type {string | null} */ (whenTypeValue(value, 'string'));
}

/**
 * Return a fallback when the provided message is falsy.
 * @param {string | undefined | null} message Candidate message.
 * @param {string} fallback Fallback value when message is falsy.
 * @returns {string} Message to surface to the caller.
 */
export function resolveMessageOrDefault(message, fallback) {
  const candidate = getStringCandidate(message);
  if (!candidate) {
    return fallback;
  }

  return candidate;
}

/**
 * Return the provided string when available or delegate to a fallback.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => string | null} fallback Function invoked when the value is not a string.
 * @returns {string | null} String from the value or fallback.
 */
export function stringOrFallback(value, fallback) {
  const normalized = getStringCandidate(value);
  if (!normalized) {
    return fallback(/** @type {unknown} */ (value));
  }

  return normalized;
}

/**
 * Evaluate a transform when a condition holds, otherwise return the fallback default.
 * @param {boolean} condition - Determines whether the transform should run.
 * @param {() => T} transform - Resolver invoked if the condition is true.
 * @param {T} fallback - Value returned when the condition is falsy.
 * @returns {T} Result of the transform when applied, or the fallback otherwise.
 * @template T
 */
export function whenOrDefault(condition, transform, fallback) {
  if (condition) {
    return transform();
  }

  return fallback;
}

/**
 * Return the provided function candidate when available, otherwise use the fallback.
 * @param {unknown} candidate Candidate value.
 * @param {() => Function} fallback Factory returning the fallback function.
 * @returns {Function} Callable derived from the candidate or fallback.
 */
export function functionOrFallback(candidate, fallback) {
  if (typeof candidate === 'function') {
    return candidate;
  }

  return fallback();
}

/**
 * Choose the most readable representation for a relative path.
 * @param {string} absolutePath Original absolute path provided to the logger.
 * @param {string} relativePath Path relative to the project root.
 * @returns {string} Either the relative path or original absolute path when outside the project.
 */
export function selectReadablePath(absolutePath, relativePath) {
  if (relativePath.startsWith('..')) {
    return absolutePath;
  }

  return relativePath;
}

/**
 * Format a target path relative to the provided project root.
 * @param {string} projectRoot Root directory to use for relative comparisons.
 * @param {string} targetPath Path to format for display.
 * @param {(from: string, to: string) => string} relativeFn Path.relative implementation.
 * @returns {string} Human-readable representation of the path.
 */
export function formatPathRelativeToProject(
  projectRoot,
  targetPath,
  relativeFn
) {
  const relativePath = relativeFn(projectRoot, targetPath);
  if (!relativePath) {
    return '.';
  }

  return selectReadablePath(targetPath, relativePath);
}

/**
 * Build an async task wrapper that maps an entry to an invocation payload.
 * @template TEntry
 * @template TPayload
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload) => Promise<unknown>} runEntry Payload executor.
 * @returns {(entry: TEntry) => Promise<void>} Async task wrapper.
 */
export function createMappedTask(mapEntry, runEntry) {
  return async entry => {
    await runEntry(mapEntry(entry));
  };
}

/**
 * Run a callback for each entry in parallel and resolve when all callbacks finish.
 * @template T
 * @param {T[]} entries Entries to process.
 * @param {(entry: T) => Promise<unknown>} iterator Async callback per entry.
 * @returns {Promise<unknown[]>} Promise resolving once every callback completes.
 */
export function runEntriesInParallel(entries, iterator) {
  if (!entries.length) {
    return Promise.resolve([]);
  }

  return Promise.all(entries.map(iterator));
}

/**
 * Map entries to payloads and execute them in parallel.
 * @template TEntry
 * @template TPayload
 * @param {TEntry[]} entries Entries to process.
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload) => Promise<unknown>} runEntry Payload executor.
 * @returns {Promise<unknown[]>} Promise resolving once every mapped entry completes.
 */
export function runMappedEntries(entries, mapEntry, runEntry) {
  return runEntriesInParallel(entries, createMappedTask(mapEntry, runEntry));
}

/**
 * Map entries and run the mapped side effects synchronously.
 * @template TEntry
 * @template TPayload
 * @param {TEntry[]} entries Entries to process.
 * @param {(entry: TEntry) => TPayload} mapEntry Entry-to-payload mapper.
 * @param {(payload: TPayload, index: number) => void} runEntry Payload executor.
 * @returns {void}
 */
export function forEachMappedEntries(entries, mapEntry, runEntry) {
  for (const [index, entry] of entries.entries()) {
    runEntry(mapEntry(entry), index);
  }
}

/**
 * Build the standard copy log message.
 * @param {{
 *   formatPathForLog: (targetPath: string) => string,
 *   sourceDestination: { source: string, destination: string },
 *   message?: string,
 * }} options Copy metadata.
 * @returns {string} Copy progress message.
 */
export function buildCopyLogMessage({
  formatPathForLog,
  sourceDestination,
  message,
}) {
  const { source, destination } = sourceDestination;
  return (
    message ??
    `Copied: ${formatPathForLog(source)} -> ${formatPathForLog(destination)}`
  );
}

/**
 * Determines whether a value is an object that is not null.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is an object and not null.
 */
export function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Normalize a candidate value to a plain object or an empty object.
 * @param {unknown} value Candidate object-like value.
 * @returns {Record<string, unknown>} Plain object or empty object.
 */
export function objectOrEmpty(value) {
  if (isNonNullObject(value)) {
    return /** @type {Record<string, unknown>} */ (value);
  }

  return {};
}

/**
 * Ensure a dependency is callable.
 * @param {unknown} candidate Candidate value.
 * @param {string} name Name used in the error message.
 * @returns {void}
 */
export function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Returns the input string when available; otherwise returns an empty string.
 * @param {unknown} value Candidate value.
 * @returns {string} Input string or empty fallback.
 */
export function ensureString(value) {
  const normalized = getStringCandidate(value);
  if (normalized === undefined) {
    return '';
  }

  return normalized;
}

/**
 * Converts a non-string value into a string, defaulting to empty when nullish.
 * @param {unknown} value Candidate value.
 * @returns {string} Safe string representation.
 */
export function normalizeNonStringValue(value) {
  if (isNullish(value)) {
    return '';
  }

  return String(value);
}

/**
 * Return the callback result when the value is not nullish; otherwise `null`.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => T} fn Callback invoked for present values.
 * @returns {T | null} Callback result or `null` when the input is nullish.
 */
export function whenNotNullish(value, fn) {
  return /** @type {any} */ (whenValueMatches(value, isNullish, fn));
}

/**
 * Return the original value when it is not nullish; otherwise `null`.
 * @template T
 * @param {T | null | undefined} value Candidate value.
 * @returns {T | null} Original value or `null` when the value is nullish.
 */
export function whenNotNullishValue(value) {
  return /** @type {any} */ (whenNotNullish(value, candidate => candidate));
}

/**
 * Run the provided callback when the value is a string.
 * @param {unknown} value Candidate value.
 * @param {(value: string) => T} fn Callback invoked with the string.
 * @returns {T | null} Callback result or `null` when the input is not a string.
 * @template T
 */
export function whenString(value, fn) {
  return /** @type {any} */ (whenValueMatches(value, isNotStringValue, fn));
}

/**
 * Normalize a string candidate to a trimmed string or an empty string.
 * @param {unknown} value Candidate string value.
 * @returns {string} Trimmed string or empty string when the value is not a string.
 */
export function trimmedStringOrEmpty(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/**
 * Normalize a string candidate to a trimmed string or `null`.
 * @param {unknown} value Candidate string value.
 * @returns {string | null} Trimmed string or `null` when the value is not a string or trims to nothing.
 */
export function trimmedStringOrNull(value) {
  const trimmed = whenString(value, candidate => candidate.trim());
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

/**
 * Run the provided callback when the value matches the requested typeof.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {string} typeName Expected typeof result.
 * @param {(value: unknown) => T} fn Callback invoked when the type matches.
 * @returns {T | null} Callback result or `null` when the type does not match.
 */
export function whenType(value, typeName, fn) {
  return whenOrNull(typeof value === typeName, () => fn(value));
}

/**
 * Run the provided callback when the value matches the requested typeof and
 * return the value unchanged.
 * @param {unknown} value Candidate value.
 * @param {string} typeName Expected typeof result.
 * @returns {unknown | null} Original value or `null` when the type does not match.
 */
export function whenTypeValue(value, typeName) {
  return whenType(value, typeName, candidate => candidate);
}

/**
 * Report an error through the provided callback and then return `false`.
 * @param {(...args: unknown[]) => void} reportFn Reporting callback.
 * @param {...unknown} args Arguments forwarded to the reporting callback.
 * @returns {false} Always returns `false`.
 */
export function reportAndReturnFalse(reportFn, ...args) {
  reportFn(...args);
  return false;
}

/**
 * Run the provided callback when the value is an array.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown[]) => T} fn Callback invoked with the array.
 * @returns {T | null} Callback result or `null` when the input is not an array.
 * @template T
 */
export function whenArray(value, fn) {
  return /** @type {any} */ (whenValueMatches(value, isNotArrayValue, fn));
}

/**
 * Run the provided callback when the value is truthy.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => T} fn Callback invoked with the value.
 * @returns {T | null} Callback result or `null` when the input is falsy.
 * @template T
 */
export function whenTruthy(value, fn) {
  return /** @type {any} */ (
    when(
      Boolean(value),
      () => fn(value),
      () => null
    )
  );
}

/**
 * Run the provided callback when the condition passes.
 * @template T
 * @param {boolean} condition Gate determining whether to invoke the callback.
 * @param {() => T} fn Callback invoked when the condition passes.
 * @returns {T | null} Callback result or `null` when the condition fails.
 */
export function whenOrNull(condition, fn) {
  return /** @type {T | null} */ (when(condition, fn, () => null));
}

/**
 * Run the callback when the supplied predicate says the value is acceptable.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => boolean} isRejected Predicate that identifies values to skip.
 * @param {(value: any) => T} fn Callback invoked when the value passes the predicate.
 * @returns {T | null} Callback result or `null` when the predicate rejects the value.
 */
function whenValueMatches(value, isRejected, fn) {
  if (isRejected(value)) {
    return null;
  }

  return fn(value);
}

/**
 * Check whether the candidate is not a string value.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is not a string.
 */
function isNotStringValue(value) {
  return typeof value !== 'string';
}

/**
 * Check whether the candidate is not an array value.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is not an array.
 */
function isNotArrayValue(value) {
  return !Array.isArray(value);
}

/**
 * Return a value when available, otherwise invoke the fallback.
 * @template T
 * @param {boolean} available Whether the value can be returned.
 * @param {T} value The preferred value.
 * @param {() => T} fallback Fallback resolver.
 * @returns {T} Preferred value or fallback output.
 */
function returnFallbackValue(available, value, fallback) {
  if (!available) {
    return fallback();
  }

  return value;
}

/**
 * Determine whether a numeric candidate is finite.
 * @param {unknown} value Candidate numeric value.
 * @returns {boolean} True when the value is a finite number.
 */
function isFiniteNumericValue(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalize a numeric candidate, returning zero when the input is not a number.
 * @param {unknown} value Candidate numeric value.
 * @returns {number} Number when provided, otherwise zero.
 */
export function numberOrZero(value) {
  return /** @type {number} */ (
    returnFallbackValue(
      isFiniteNumericValue(value),
      /** @type {any} */ (value),
      () => 0
    )
  );
}

/**
 * Provide a safe fallback resolver for cases when one isn't supplied.
 * @param {(() => unknown) | undefined} fallback Optional fallback resolver.
 * @returns {() => unknown} Resolver to invoke when the condition fails.
 */
function resolveWhenFallback(fallback) {
  if (typeof fallback === 'function') {
    return fallback;
  }

  return () => null;
}

/**
 * Execute the transform when the condition is true, otherwise return the fallback result.
 * @param {boolean} condition - Determines whether the transform should run.
 * @param {() => unknown} transform - Resolver invoked when the condition holds.
 * @param {() => unknown} [fallback] - Resolver invoked when the condition is falsy.
 * @returns {unknown} Result of the transform or the fallback.
 */
export function when(condition, transform, fallback) {
  if (!condition) {
    return resolveWhenFallback(fallback)();
  }

  return transform();
}

/**
 * Execute the action and return `undefined` when it throws.
 * @param {() => unknown} action Callback that may throw.
 * @returns {unknown} The action result or `undefined` when an error occurs.
 */
function executeSafely(action) {
  try {
    return action();
  } catch {
    return undefined;
  }
}

/**
 * Check if a result indicates an execution error.
 * @param {unknown} result The result to check.
 * @returns {boolean} True if result is undefined (indicating error).
 */
function didExecutionFail(result) {
  return result === undefined;
}

/**
 * Resolve a safe execution result, falling back when the action failed.
 * @param {unknown} result - Result of the execution.
 * @param {() => unknown} fallback - Fallback function to call when execution failed.
 * @returns {unknown} The result or fallback value.
 */
function resolveSafeExecutionResult(result, fallback) {
  return returnFallbackValue(!didExecutionFail(result), result, fallback);
}

/**
 * Evaluate the action and return its result, falling back when an exception occurs.
 * @param {() => unknown} action - Function that may throw.
 * @param {() => unknown} [fallback] - Value returned when an error is thrown.
 * @returns {unknown} Action result or the fallback.
 */
export function tryOr(action, fallback = () => undefined) {
  const result = executeSafely(action);
  return resolveSafeExecutionResult(result, fallback);
}

/**
 * Determine the directory of the current module using an injected helper.
 * @param {string} moduleUrl - The module URL from import.meta.url.
 * @param {(moduleUrl: string) => string} fileURLToPathFn File URL resolver.
 * @param {(input: string) => string} dirnameFn Directory resolver.
 * @returns {string} Absolute path to the module directory.
 */
export function getCurrentDirectory(moduleUrl, fileURLToPathFn, dirnameFn) {
  return dirnameFn(fileURLToPathFn(moduleUrl));
}

/**
 * Resolve key project directories relative to a given module directory.
 * @param {string} moduleDirectory - Directory containing the current module.
 * @param {(input: string, ...segments: string[]) => string} resolveFn Path resolver.
 * @returns {{ projectRoot: string, srcDir: string, publicDir: string }} Project directory map.
 */
export function resolveProjectDirectories(moduleDirectory, resolveFn) {
  const projectRoot = resolveFn(moduleDirectory, '../..');
  const srcDir = resolveFn(projectRoot, 'src');
  const publicDir = resolveFn(projectRoot, 'public');

  return { projectRoot, srcDir, publicDir };
}

/**
 * Provide the subset of a path module used by copy utilities.
 * @param {{
 *   join: (base: string, ...segments: string[]) => string,
 *   dirname: (input: string) => string,
 *   relative: (from: string, to: string) => string,
 *   resolve: (input: string, ...segments: string[]) => string,
 *   extname: (input: string) => string,
 * }} pathModule Path dependency bundle.
 * @returns {any} Adapter exposing required path helpers.
 */
export function createPathAdapters(pathModule) {
  const typedPathModule = /** @type {any} */ (pathModule);
  return {
    join: typedPathModule.join,
    dirname: typedPathModule.dirname,
    relative: typedPathModule.relative,
    resolve: typedPathModule.resolve,
    extname: typedPathModule.extname,
  };
}

/**
 * Create the path adapter wrapper handle.
 * @param {{ pathModule: Parameters<typeof createPathAdapters>[0], fileURLToPathFn: (moduleUrl: string) => string, dirnameFn: (input: string) => string }} deps Path dependencies.
 * @returns {{
 *   getCurrentDirectory: typeof getCurrentDirectory,
 *   resolveProjectDirectories: typeof resolveProjectDirectories,
 *   createPathAdapters: typeof createPathAdapters
 * }} Path adapter exports.
 */
export function createPathHandle(deps) {
  return {
    getCurrentDirectory: moduleUrl =>
      getCurrentDirectory(moduleUrl, deps.fileURLToPathFn, deps.dirnameFn),
    resolveProjectDirectories: moduleDirectory =>
      resolveProjectDirectories(
        moduleDirectory,
        /** @type {any} */ (deps.pathModule).resolve
      ),
    createPathAdapters: () =>
      createPathAdapters(/** @type {any} */ (deps.pathModule)),
  };
}

/**
 * Create the filesystem adapter wrapper handle.
 * @param {{
 *   fsModule: any,
 *   fsPromisesModule: any,
 * }} deps Filesystem dependencies.
 * @returns {{
 *   createFsAdapters: typeof createFsAdapters,
 *   createAsyncFsAdapters: typeof createAsyncFsAdapters
 * }} Filesystem adapter exports.
 */
export function createFsHandle(deps) {
  return {
    createFsAdapters: () => createFsAdapters(deps.fsModule),
    createAsyncFsAdapters: () => createAsyncFsAdapters(deps.fsPromisesModule),
  };
}

/**
 * Sync filesystem helpers for the copy generator.
 * @param {{
 *   existsSync: (target: string) => boolean,
 *   mkdirSync: (target: string, options?: { recursive?: boolean }) => void,
 *   rmSync: (target: string, options?: { recursive?: boolean, force?: boolean }) => void,
 *   copyFileSync: (source: string, destination: string) => void,
 *   readdirSync: (dir: string, options?: { withFileTypes?: boolean }) => unknown[],
 * }} fsModule Filesystem dependency bundle.
 * @returns {{
 *   directoryExists: (target: string) => boolean,
 *   createDirectory: (target: string) => void,
 *   removeDirectory: (target: string) => void,
 *   copyFile: (source: string, destination: string) => void,
 *   readDirEntries: (dir: string) => unknown[],
 * }} Filesystem adapter helpers.
 */
export function createFsAdapters(fsModule) {
  return {
    directoryExists: target => fsModule.existsSync(target),
    createDirectory: target => fsModule.mkdirSync(target, { recursive: true }),
    removeDirectory: target =>
      fsModule.rmSync(target, { recursive: true, force: true }),
    copyFile: (source, destination) =>
      fsModule.copyFileSync(source, destination),
    readDirEntries: dir => fsModule.readdirSync(dir, { withFileTypes: true }),
  };
}

/**
 * Async filesystem helpers that swallow missing directories.
 * @param {{
 *   readdir: (dir: string, options?: { withFileTypes?: boolean }) => Promise<unknown[]>,
 *   mkdir: (target: string, options?: { recursive?: boolean }) => Promise<unknown>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 * }} fsPromisesModule Promise-based filesystem dependency bundle.
 * @returns {{
 *   readDirEntries: (dir: string) => Promise<import('fs').Dirent[]>,
 *   ensureDirectory: (target: string) => Promise<void>,
 *   copyFile: (source: string, destination: string) => Promise<void>,
 *   setCopiedFileTimestamp: (target: string) => Promise<void>,
 *   readFile: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFile: (filePath: string, content: string) => Promise<void>,
 * }} Promise-based filesystem adapter helpers.
 */
export function createAsyncFsAdapters(fsPromisesModule) {
  const typedFsPromisesModule = /** @type {any} */ (fsPromisesModule);
  return {
    async readDirEntries(dir) {
      try {
        return /** @type {import('fs').Dirent[]} */ (
          await typedFsPromisesModule.readdir(dir, { withFileTypes: true })
        );
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    },
    async ensureDirectory(target) {
      await typedFsPromisesModule.mkdir(target, { recursive: true });
    },
    async copyFile(source, destination) {
      await typedFsPromisesModule.copyFile(source, destination);
    },
    async setCopiedFileTimestamp(target) {
      if (typeof typedFsPromisesModule.utimes !== 'function') {
        return;
      }

      const stableTimestamp = new Date('2000-01-01T00:00:00.000Z');
      await typedFsPromisesModule.utimes(
        target,
        stableTimestamp,
        stableTimestamp
      );
    },
    async readFile(filePath, encoding) {
      return /** @type {Promise<string>} */ (
        typedFsPromisesModule.readFile(filePath, encoding)
      );
    },
    async writeFile(filePath, content) {
      await typedFsPromisesModule.writeFile(filePath, content);
    },
  };
}

/**
 * Repository quality checks run by the aggregate check script.
 * @type {{ name: string, command: string, args: string[] }[]}
 */
export const CHECK_COMMANDS = [
  { name: 'test', command: 'npm', args: ['test'] },
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'depcruise', command: 'npm', args: ['run', 'depcruise'] },
  { name: 'core-parse', command: 'npm', args: ['run', 'core-parse'] },
  { name: 'duplication', command: 'npm', args: ['run', 'duplication'] },
  {
    name: 'entrypoint-pattern',
    command: 'npm',
    args: ['run', 'entrypoint-pattern'],
  },
  { name: 'non-core-thin', command: 'npm', args: ['run', 'non-core-thin'] },
  {
    name: 'overexposed-exports',
    command: 'npm',
    args: ['run', 'overexposed-exports'],
  },
  { name: 'tsdoc:check', command: 'npm', args: ['run', 'tsdoc:check'] },
  {
    name: 'audit',
    command: 'npm',
    args: ['audit', '--audit-level=low'],
  },
];

/**
 * Create the command handler for the aggregate check script.
 * @param {{
 *   argv: string[],
 *   runSuite: (options: { failFast: boolean }) => Promise<{ exitCode: number }>,
 *   setExitCode: (exitCode: number) => void,
 * }} deps Command dependencies.
 * @returns {() => Promise<void>} Handler that runs the aggregate check.
 */
export function createRunCheckHandle({ argv, runSuite, setExitCode }) {
  return async () => {
    const failFast = argv.includes('--fail-fast');
    const result = await runSuite({ failFast });
    setExitCode(result.exitCode);
  };
}

/**
 * @typedef {object} CheckCommand
 * @property {string} name Check label.
 * @property {string} command Command to execute.
 * @property {string[]} args Command arguments.
 */

/**
 * @typedef {object} CheckEvent
 * @property {'check-start' | 'check-success' | 'check-failure' | 'check-summary'} type Event type.
 * @property {string} name Check label.
 * @property {string} command Command string.
 * @property {number | null} [exitCode] Process exit code.
 * @property {string | null} [signal] Process termination signal.
 * @property {number} [durationMs] Elapsed time in milliseconds.
 * @property {string} [error] Spawn or runtime error description.
 * @property {CheckFailure[]} [failures] Failures observed across the suite.
 * @property {number} [total] Total number of checks.
 * @property {number} [failed] Number of failed checks.
 * @property {'passed' | 'failed'} [status] Overall suite status.
 */

/**
 * @typedef {object} CheckFailure
 * @property {string} name Check label.
 * @property {string} command Command string.
 * @property {number | null} exitCode Process exit code.
 * @property {string | null} signal Process termination signal.
 * @property {number} durationMs Elapsed time in milliseconds.
 * @property {string} [error] Spawn or runtime error description.
 */

/**
 * Create a check-suite runner using injected platform defaults.
 * @param {{
 *   defaultSpawn: (command: string, args: string[], options: { stdio: ['ignore', 'pipe', 'pipe'] }) => {
 *     stdout: { on: (event: string, handler: (...args: unknown[]) => void) => unknown, setEncoding?: (encoding: string) => void } | null | undefined,
 *     stderr: { on: (event: string, handler: (...args: unknown[]) => void) => unknown, setEncoding?: (encoding: string) => void } | null | undefined,
 *     on: (event: 'error' | 'close', handler: (...args: unknown[]) => void) => unknown,
 *     kill?: (signal?: string) => boolean,
 *   },
 *   defaultStdout: { write: (text: string) => void },
 *   defaultStderr: { write: (text: string) => void },
 *   defaultNow: () => number,
 * }} defaults Default platform dependencies.
 * @returns {(options?: {
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: typeof defaults.defaultSpawn,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }) => Promise<{ exitCode: number, failures: CheckFailure[] }>} Runner function.
 */
export function createRunCheckSuite(defaults) {
  return async function runCheckSuite(options) {
    const { commands, failFast, spawnImpl, stdout, stderr, now } =
      resolveRunCheckOptions(options, defaults);

    /** @type {CheckFailure[]} */
    const failures = [];
    const activeChildren = new Map();
    let aborted = false;

    if (commands.length === 0) {
      emitEvent(stderr, {
        type: 'check-summary',
        name: 'check-suite',
        command: 'npm run check',
        status: 'passed',
        total: 0,
        failed: 0,
        failures: [],
      });
      return { exitCode: 0, failures };
    }

    await Promise.all(
      commands.map(command => {
        return new Promise(resolve => {
          const startedAt = now();
          let child;
          let settled = false;

          if (failFast && aborted) {
            resolve(undefined);
            return;
          }

          /**
           * Record a failure exactly once for the current command.
           * @param {CheckFailure} failure Failure details to report.
           * @param {boolean} shouldAbort Whether fail-fast should stop the rest of the suite.
           * @returns {void}
           */
          const finishWithFailure = (failure, shouldAbort) => {
            settled = true;
            failures.push(failure);
            emitFailureEvent(stderr, command.name, failure);

            if (shouldAbort && failFast && !aborted) {
              aborted = true;
              abortRemainingChildren(activeChildren, command.name);
            }

            resolve(undefined);
          };

          try {
            child = /** @type {any} */ (spawnImpl)(
              command.command,
              command.args,
              {
                stdio: ['ignore', 'pipe', 'pipe'],
              }
            );
          } catch (error) {
            const failure = buildSpawnFailure(command, startedAt, error, now);
            failures.push(failure);
            emitFailureEvent(stderr, command.name, failure);

            if (failFast) {
              aborted = true;
              abortRemainingChildren(activeChildren, command.name);
            }

            resolve(undefined);
            return;
          }

          activeChildren.set(command.name, child);
          emitEvent(stderr, {
            type: 'check-start',
            name: command.name,
            command: renderCommand(command),
          });
          forwardStreamLines(child.stdout, line =>
            stdout.write(`[${command.name}][stdout] ${line}\n`)
          );
          forwardStreamLines(child.stderr, line =>
            stderr.write(`[${command.name}][stderr] ${line}\n`)
          );

          child.on(
            'error',
            /** @param {any} error Error raised by the child process. */ error => {
              if (settled || (aborted && failFast)) {
                return;
              }

              const failure = buildSpawnFailure(command, startedAt, error, now);
              finishWithFailure(failure, true);
            }
          );

          child.on(
            'close',
            /**
             * @param {any} exitCode Exit code reported by the child process.
             * @param {any} signal Process signal reported by the child process.
             */ (exitCode, signal) => {
              activeChildren.delete(command.name);

              if (settled) {
                resolve(undefined);
                return;
              }

              if (
                aborted &&
                failFast &&
                failures.length > 0 &&
                failures[0].name !== command.name
              ) {
                settled = true;
                resolve(undefined);
                return;
              }

              const durationMs = Math.max(0, now() - startedAt);
              if (exitCode === 0 && signal === null) {
                settled = true;
                emitEvent(stderr, {
                  type: 'check-success',
                  name: command.name,
                  command: renderCommand(command),
                  exitCode,
                  signal,
                  durationMs,
                });
              } else {
                const failure = {
                  name: command.name,
                  command: renderCommand(command),
                  exitCode,
                  signal,
                  durationMs,
                };
                finishWithFailure(failure, true);
              }
              resolve(undefined);
            }
          );
        });
      })
    );

    let exitCode = 0;
    if (failures.length !== 0) {
      exitCode = 1;
    }

    /** @type {'passed' | 'failed'} */
    let status = 'passed';
    if (exitCode !== 0) {
      status = 'failed';
    }
    emitEvent(stderr, {
      type: 'check-summary',
      name: 'check-suite',
      command: 'npm run check',
      status,
      total: commands.length,
      failed: failures.length,
      failures,
    });

    return { exitCode, failures };
  };
}

/**
 * Resolve runner options with sensible defaults.
 * @param {{
 *   commands?: CheckCommand[],
 *   failFast?: boolean,
 *   spawnImpl?: unknown,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   now?: () => number,
 * }} [options] Runner configuration.
 * @param {{
 *   defaultSpawn?: unknown,
 *   defaultStdout?: { write: (text: string) => void },
 *   defaultStderr?: { write: (text: string) => void },
 *   defaultNow?: () => number,
 * }} [defaults] Injected platform defaults.
 * @returns {{
 *   commands: CheckCommand[],
 *   failFast: boolean,
 *   spawnImpl: unknown,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   now: () => number,
 * }} Normalized runner options.
 */
export function resolveRunCheckOptions(options = {}, defaults = {}) {
  return {
    commands: resolveCheckCommands(options),
    failFast: resolveFailFast(options),
    spawnImpl: resolveSpawnImpl(options, defaults),
    stdout: resolveOutputStream(
      options.stdout,
      defaults.defaultStdout,
      'stdout'
    ),
    stderr: resolveOutputStream(
      options.stderr,
      defaults.defaultStderr,
      'stderr'
    ),
    now: resolveNow(options, defaults),
  };
}

/**
 * Resolve the command list for a run-check invocation.
 * @param {{ commands?: CheckCommand[] }} options Runner options.
 * @returns {CheckCommand[]} Commands to execute.
 */
function resolveCheckCommands(options) {
  return options.commands ?? CHECK_COMMANDS;
}

/**
 * Resolve whether run-check should stop after the first failure.
 * @param {{ failFast?: boolean }} options Runner options.
 * @returns {boolean} True when the runner should stop after the first failure.
 */
function resolveFailFast(options) {
  return options.failFast ?? false;
}

/**
 * Resolve the child-process spawn implementation.
 * @param {{ spawnImpl?: unknown }} options Runner options.
 * @param {{ defaultSpawn?: unknown }} defaults Injected defaults.
 * @returns {unknown} Spawn implementation.
 */
function resolveSpawnImpl(options, defaults) {
  return options.spawnImpl ?? defaults.defaultSpawn;
}

/**
 * Resolve a standard output stream for run-check logging.
 * @param {{ write: (text: string) => void } | undefined} stream Explicit stream.
 * @param {{ write: (text: string) => void } | undefined} defaultStream Default stream.
 * @param {'stdout' | 'stderr'} kind Stream kind.
 * @returns {{ write: (text: string) => void }} Output stream.
 */
function resolveOutputStream(stream, defaultStream, kind) {
  return stream ?? defaultStream ?? getDefaultOutputStream(kind);
}

/**
 * Resolve the timestamp provider for run-check timing.
 * @param {{ now?: () => number }} options Runner options.
 * @param {{ defaultNow?: () => number }} defaults Injected defaults.
 * @returns {() => number} Timestamp provider.
 */
function resolveNow(options, defaults) {
  return options.now ?? defaults.defaultNow ?? (() => Date.now());
}

/**
 * Abort every active child process except the named one.
 * @param {Map<string, { kill?: (signal?: string) => boolean }>} activeChildren Active child process map.
 * @param {string} exemptName Command name to keep alive.
 * @returns {void}
 */
function abortRemainingChildren(activeChildren, exemptName) {
  for (const [name, child] of activeChildren.entries()) {
    if (name === exemptName) {
      continue;
    }

    if (child && typeof child.kill === 'function') {
      child.kill('SIGTERM');
    }
  }
}

/**
 * Build a structured failure payload for a child process spawn error.
 * @param {CheckCommand} command Command that failed to spawn.
 * @param {number} startedAt Start timestamp.
 * @param {unknown} error Spawn error value.
 * @param {() => number} now Clock helper.
 * @returns {CheckFailure} Structured spawn failure.
 */
function buildSpawnFailure(command, startedAt, error, now) {
  let errorMessage = String(error);
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  return {
    name: command.name,
    command: renderCommand(command),
    exitCode: 1,
    signal: null,
    durationMs: Math.max(0, now() - startedAt),
    error: errorMessage,
  };
}

/**
 * Forward a stream's lines to a writer callback.
 * @param {{ on: (event: string, handler: (...args: unknown[]) => void) => unknown, setEncoding?: (encoding: string) => void } | null | undefined} stream Stream to forward.
 * @param {(line: string) => void} writer Line writer callback.
 * @returns {void}
 */
function forwardStreamLines(stream, writer) {
  if (!stream || typeof stream.on !== 'function') {
    return;
  }

  if (typeof stream.setEncoding === 'function') {
    stream.setEncoding('utf8');
  }

  const bufferState = { text: '' };

  stream.on('data', chunk => {
    bufferState.text += String(chunk);
    const lines = bufferState.text.split(/\r?\n/);
    bufferState.text = /** @type {string} */ (lines.pop());
    for (const line of lines) {
      if (line.length > 0) {
        writer(line);
      }
    }
  });

  const flush = () => {
    if (bufferState.text.length > 0) {
      writer(bufferState.text);
      bufferState.text = '';
    }
  };

  stream.on('end', flush);
  stream.on('close', flush);
}

/**
 * Render a command line string for structured events.
 * @param {CheckCommand} command Command to render.
 * @returns {string} Rendered command string.
 */
function renderCommand(command) {
  return [command.command, ...command.args].join(' ');
}

/**
 * Emit a JSONL event to the provided writer.
 * @param {{ write: (text: string) => void }} writer Output writer.
 * @param {CheckEvent} event Event payload.
 * @returns {void}
 */
function emitEvent(writer, event) {
  writer.write(`${JSON.stringify(event)}\n`);
}

/**
 * Emit a structured failure event for a specific check.
 * @param {{ write: (text: string) => void }} writer Output writer.
 * @param {string} name Check label.
 * @param {CheckFailure} failure Failure details to report.
 * @returns {void}
 */
function emitFailureEvent(writer, name, failure) {
  emitEvent(writer, {
    type: 'check-failure',
    name,
    command: failure.command,
    exitCode: failure.exitCode,
    signal: failure.signal,
    durationMs: failure.durationMs,
    error: failure.error,
  });
}

/**
 * Resolve a default writable stream when running in Node.
 * @param {'stdout' | 'stderr'} streamName Stream name to use when available.
 * @returns {{ write: (text: string) => void }} Writable stream-like object.
 */
function getDefaultOutputStream(streamName) {
  if (typeof process !== 'undefined' && process?.[streamName]) {
    return process[streamName];
  }

  return { write: () => {} };
}
