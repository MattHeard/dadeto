/**
 * Default storage bucket used for production content.
 * Shared so non-Cloud systems can mirror the same configuration.
 */
export const DEFAULT_BUCKET_NAME = 'www.dendritestories.co.nz';

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
 * Determines whether a value is an object that is not null.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is an object and not null.
 */
export function isNonNullObject(value) {
  return Boolean(value) && typeof value === 'object';
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
 * Return the string candidate when available.
 * @param {unknown} value Candidate value.
 * @returns {string | undefined} String when provided, otherwise undefined.
 */
function getStringCandidate(value) {
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

/**
 * Check if a normalized string is acceptable.
 * @param {string | undefined} normalized Candidate normalized string.
 * @param {(normalized: string | undefined) => boolean} isAcceptable Acceptance predicate.
 * @returns {boolean} True if normalized is defined and acceptable.
 */
function isAcceptableNormalizedString(normalized, isAcceptable) {
  return normalized !== undefined && isAcceptable(normalized);
}

/**
 * Apply a fallback when the string candidate doesn't meet the acceptance predicate.
 * @param {unknown} value Candidate value.
 * @param {() => string | null} fallback Fallback result supplier.
 * @param {(normalized: string | undefined) => boolean} isNormalizedAcceptable Predicate indicating when the normalized string should be returned.
 * @returns {string | null} Normalized string or fallback.
 */
function withStringFallback(value, fallback, isNormalizedAcceptable) {
  const normalized = getStringCandidate(value);
  if (isAcceptableNormalizedString(normalized, isNormalizedAcceptable)) {
    return /** @type {string} */ (normalized);
  }

  return fallback();
}

/**
 * Returns the input string when available; otherwise returns an empty string.
 * @param {unknown} value Candidate value.
 * @returns {string} Input string or empty fallback.
 */
export function ensureString(value) {
  const normalized = stringOrNull(value);
  return /** @type {string} */ (when(
    normalized !== null,
    () => normalized,
    () => ''
  ));
}

/**
 * Return the provided string when available; otherwise use the fallback.
 * @param {unknown} value Candidate value that may be a string.
 * @param {string} fallback Replacement when the value is not a string.
 * @returns {string} String value or fallback.
 */
export function stringOrDefault(value, fallback) {
  const normalized = withStringFallback(
    value,
    () => fallback,
    normalized => normalized !== undefined
  );

  return /** @type {string} */ (when(
    normalized !== null,
    () => normalized,
    () => fallback
  ));
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
 * Return the input when it is a string; otherwise `null`.
 * @param {unknown} value Candidate value.
 * @returns {string | null} String when provided, otherwise `null`.
 */
export function stringOrNull(value) {
  const normalized = getStringCandidate(value);
  if (normalized !== undefined) {
    return normalized;
  }

  return null;
}

/**
 * Return the provided string when available or delegate to a fallback.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => string | null} fallback Function invoked when the value is not a string.
 * @returns {string | null} String from the value or fallback.
 */
export function stringOrFallback(value, fallback) {
  return withStringFallback(
    value,
    () => fallback(value),
    normalized => Boolean(normalized)
  );
}

/**
 * Run the provided callback when the value is a string.
 * @param {unknown} value Candidate value.
 * @param {(value: string) => T} fn Callback invoked with the string.
 * @returns {T | null} Callback result or `null` when the input is not a string.
 * @template T
 */
export function whenString(value, fn) {
  if (typeof value !== 'string') {
    return null;
  }

  return fn(value);
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
 * Run a side effect when a condition is truthy and indicate whether it ran.
 * @param {boolean} condition - Determines whether to execute the effect.
 * @param {() => void} effect - Side effect invoked when the condition holds.
 * @returns {boolean} True when the effect executed, false otherwise.
 */
export function guardThen(condition, effect) {
  if (!condition) {
    return false;
  }

  effect();
  return true;
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
  if (didExecutionFail(result)) {
    return fallback();
  }
  return result;
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
