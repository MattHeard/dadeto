/**
 * Check whether a value is a non-empty string.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether the value is a non-empty string.
 */
export function isValidString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check whether a value is nullish.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether the value is null or undefined.
 */
export function isNullish(value) {
  return value === undefined || value === null;
}

/**
 * Parse JSON and return null when parsing fails.
 * @param {string} value Raw JSON string.
 * @returns {unknown} Parsed value or null.
 */
export function parseJsonOrNull(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON string or accept an object record.
 * @param {unknown} value Raw JSON or object value.
 * @returns {Record<string, unknown> | null} Object record or null.
 */
export function parseObjectRecord(value) {
  const parsed = typeof value === 'string' ? parseJsonOrNull(value) : value;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return /** @type {Record<string, unknown>} */ (parsed);
  }
  return null;
}

/**
 * Ensure a dependency is callable.
 * @param {unknown} candidate Candidate value.
 * @param {string} name Dependency name.
 * @returns {void}
 */
export function assertFunction(candidate, name) {
  if (typeof candidate !== 'function')
    throw new TypeError(`${name} must be a function`);
}

/**
 * Return an array candidate or an empty array.
 * @param {unknown} value Candidate value.
 * @returns {unknown[]} Array candidate or empty array.
 */
export function arrayOrEmpty(value) {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Normalize a candidate to an object or an empty object.
 * @param {unknown} value Candidate value.
 * @returns {Record<string, unknown>} Object candidate or empty object.
 */
export function objectOrEmpty(value) {
  if (isNonNullObject(value))
    return /** @type {Record<string, unknown>} */ (value);
  return {};
}

/**
 * Convert a possibly nullish value to a string.
 * @param {unknown} value Candidate value.
 * @returns {string} String value or empty string.
 */
export function normalizeNonStringValue(value) {
  if (isNullish(value)) return '';
  return String(value);
}

/**
 * Check whether a value is a non-empty trimmed string.
 * @param {unknown} value Candidate value.
 * @returns {value is string} Whether the value is a non-empty string.
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

/**
 * Normalize a possibly missing numeric value.
 * @param {number | null | undefined} value Maybe-present number.
 * @returns {number | null} Normalized numeric value.
 */
export function normalizeMaybeNumber(value) {
  if (typeof value === 'number') return value;
  return null;
}

/**
 * Return an object value or null.
 * @param {unknown} value Candidate object value.
 * @returns {Record<string, unknown> | null} Object value or null.
 */
export function getRecordOrNull(value) {
  if (value && typeof value === 'object')
    return /** @type {Record<string, unknown>} */ (value);
  return null;
}

/**
 * Return the first non-empty string.
 * @param {unknown} candidate Candidate string or string array.
 * @returns {string | null} First non-empty string.
 */
export function firstStringOrNull(candidate) {
  if (typeof candidate === 'string') {
    if (isNonEmptyString(candidate)) return candidate.trim();
    return null;
  }
  if (Array.isArray(candidate)) return firstStringOrNull(candidate[0]);
  return null;
}

/**
 * Return a string candidate when available.
 * @param {unknown} value Candidate value.
 * @returns {string | undefined} String when provided.
 */
export function getStringCandidate(value) {
  if (typeof value === 'string') return value;
  return undefined;
}

/**
 * Ensure a value is a string.
 * @param {unknown} value Candidate value.
 * @returns {string} Input string or empty fallback.
 */
export function ensureString(value) {
  return getStringCandidate(value) ?? '';
}

/**
 * Trim a string candidate.
 * @param {unknown} value Candidate string value.
 * @returns {string} Trimmed string or empty string.
 */
export function trimmedStringOrEmpty(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Check whether a value is not a string.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether value is not a string.
 */
export function isNotStringValue(value) {
  return typeof value !== 'string';
}

/**
 * Check whether a value is not an array.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether value is not an array.
 */
export function isNotArrayValue(value) {
  return !Array.isArray(value);
}

/**
 * Check whether a value is a finite number.
 * @param {unknown} value Candidate numeric value.
 * @returns {boolean} Whether value is finite numeric.
 */
export function isFiniteNumericValue(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Resolve an optional fallback function.
 * @param {(() => unknown) | undefined} fallback Optional fallback.
 * @returns {() => unknown} Safe fallback resolver.
 */
export function resolveWhenFallback(fallback) {
  if (typeof fallback === 'function') return fallback;
  return () => null;
}

/**
 * Invoke a callback when a value has the requested type.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {string} typeName Expected type.
 * @param {(value: unknown) => T} fn Callback.
 * @returns {T | null} Callback result or null.
 */
export function whenType(value, typeName, fn) {
  return invokeWhen(typeof value === typeName, value, fn);
}

/**
 * Invoke a callback when a value is truthy.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => T} fn Callback.
 * @returns {T | null} Callback result or null.
 */
export function whenTruthy(value, fn) {
  return invokeWhen(Boolean(value), value, fn);
}

/**
 *
 * @param condition
 * @param value
 * @param fn
 */
/**
 * Invoke a callback when a condition passes.
 * @template T
 * @param {boolean} condition Gate condition.
 * @param {unknown} value Callback value.
 * @param {(value: unknown) => T} fn Callback.
 * @returns {T | null} Callback result or null.
 */
function invokeWhen(condition, value, fn) {
  if (!condition) return null;
  return fn(value);
}

/**
 * Check whether a value is a non-null object.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether value is a non-null object.
 */
export function isNonNullObject(value) {
  const valueType = typeof value;
  return value !== null && valueType === 'object';
}

/**
 * Check whether an execution result represents failure.
 * @param {unknown} result Execution result.
 * @returns {boolean} Whether the result is undefined.
 */
export function didExecutionFail(result) {
  return result === undefined;
}

/**
 * Check whether an error represents a missing filesystem entry.
 * @param {unknown} error Error candidate.
 * @returns {boolean} Whether the error is ENOENT.
 */
export function isMissingFileError(error) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      /** @type {{ code?: unknown }} */ (error).code === 'ENOENT'
  );
}

/**
 * Require an injected path module.
 * @param {object | null | undefined} pathModule Path module candidate.
 * @returns {object} Required path module.
 */
export function requirePathModule(pathModule) {
  if (!pathModule) throw new Error('pathModule is required.');
  return pathModule;
}

/**
 * Return a callable candidate or invoke a fallback factory.
 * @param {unknown} candidate Candidate value.
 * @param {() => unknown} fallback Fallback factory.
 * @returns {unknown} Callable candidate or fallback result.
 */
export function functionOrFallback(candidate, fallback) {
  if (typeof candidate === 'function') return candidate;
  return fallback();
}

/**
 * Report failures and set a non-zero exit code when needed.
 * @param {{ failures: string[], output: { error: (line: string) => void }, setExitCode: (exitCode: number) => void }} options Failure dependencies.
 * @returns {boolean} Whether failures were reported.
 */
export function reportFailuresAndExit({ failures, output, setExitCode }) {
  if (failures.length === 0) return false;
  failures.forEach(failure => output.error(failure));
  setExitCode(1);
  return true;
}
