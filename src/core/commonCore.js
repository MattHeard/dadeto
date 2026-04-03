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
 * Checks whether every candidate is a non-empty string.
 * @param {...unknown} values Candidate values to validate.
 * @returns {boolean} True when all inputs are non-empty strings.
 */
export function areValidStrings(...values) {
  return values.every(isValidString);
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
 * Determines whether a value is a string that trims to nothing.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is a blank string.
 */
export function isBlankStringValue(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim().length === 0;
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
 * Convert key/value tuples into a plain object.
 * @template T
 * @param {Array<[string, T]>} entries Key/value tuples to convert.
 * @returns {Record<string, T>} Object built from the provided tuples.
 */
export function entriesToObject(entries) {
  return Object.fromEntries(entries);
}

/**
 * Normalize a candidate string value.
 * @param {unknown} value Candidate value.
 * @returns {string | null} String value when present, otherwise null.
 */
export function stringOrNull(value) {
  return whenTypeValue(value, 'string');
}

/**
 * Return the provided message or fallback text when the message is blank.
 * @param {unknown} message Candidate message value.
 * @param {string} fallback Fallback text to use when the message is blank.
 * @returns {string} Non-empty message or fallback text.
 */
export function resolveMessageOrDefault(message, fallback) {
  const candidate = stringOrNull(message);
  if (candidate) {
    return candidate;
  }

  return fallback;
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
 *   source: string,
 *   destination: string,
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
 * Build an exports object from explicit name/value tuples.
 * @param {Array<[string, unknown]>} entries Name/value pairs to expose.
 * @returns {Record<string, unknown>} Combined helpers ready for export.
 */
export function buildCopyExportMap(entries) {
  return entriesToObject(entries);
}

/**
 * Return either the provided value or the fallback result when an error exists.
 * @template T
 * @param {unknown} error Error value to inspect.
 * @param {() => T} fallback Lazy fallback result producer.
 * @returns {T | { error: unknown }} Fallback result or wrapped error object.
 */
export function returnErrorResultOrValue(error, fallback) {
  if (error) {
    return { error };
  }

  return fallback();
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
    return value;
  }

  return {};
}

/**
 * Normalize an object-like value with a caller-supplied fallback and transform.
 * @template T
 * @param {unknown} value Candidate object-like value.
 * @param {() => T} fallback Fallback value creator.
 * @param {(value: Record<string, unknown>) => T} transform Object mapper.
 * @returns {T} Normalized result.
 */
export function normalizeObjectOrFallback(value, fallback, transform) {
  if (!isNonNullObject(value)) {
    return fallback();
  }

  return transform(/** @type {Record<string, unknown>} */ (value));
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
export function getStringCandidate(value) {
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
  return returnFallbackValue(
    isAcceptableNormalizedString(normalized, isNormalizedAcceptable),
    /** @type {string} */ (normalized),
    fallback
  );
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
  return whenValueMatches(value, isNullish, fn);
}

/**
 * Return the original value when it is not nullish; otherwise `null`.
 * @template T
 * @param {T | null | undefined} value Candidate value.
 * @returns {T | null} Original value or `null` when the value is nullish.
 */
export function whenNotNullishValue(value) {
  return whenNotNullish(value, candidate => candidate);
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
  return whenValueMatches(value, isNotStringValue, fn);
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
 * Return the original value when the predicate accepts it; otherwise `null`.
 * @template T
 * @param {T} value Candidate value.
 * @param {(value: T) => boolean} predicate Predicate that determines whether the value is accepted.
 * @returns {T | null} Original value or `null` when rejected.
 */
export function whenPredicateValue(value, predicate) {
  return whenOrNull(predicate(value), () => value);
}

/**
 * Normalize a string candidate to a trimmed string or an empty string.
 * @param {unknown} value Candidate string value.
 * @returns {string} Trimmed string or empty string when the value is not a string.
 */
export function trimmedStringOrEmpty(value) {
  return whenString(value, candidate => candidate.trim()) ?? '';
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
 * Determine whether a value is nullish or an empty string.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value should be treated as missing.
 */
export function isNullishOrEmptyString(value) {
  return isNullish(value) || value === '';
}

/**
 * Normalize a value, then truncate it to the requested maximum length.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {number} maxLength Maximum length of the normalized result.
 * @param {(value: unknown) => T} normalize Callback that produces the normalized value.
 * @returns {T} Normalized and truncated value.
 */
export function normalizeValueWithLimit(value, maxLength, normalize) {
  return normalize(value).slice(0, maxLength);
}

/**
 * Build a CORS options object from an origin handler and method list.
 * @param {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} origin Origin handler.
 * @param {string[]} methods Allowed HTTP methods.
 * @returns {{ origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void, methods: string[] }} CORS options object.
 */
export function createCorsOptionsValue(origin, methods = ['POST']) {
  return { origin, methods };
}

/**
 * Run the provided callback when the value is an array.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown[]) => T} fn Callback invoked with the array.
 * @returns {T | null} Callback result or `null` when the input is not an array.
 * @template T
 */
export function whenArray(value, fn) {
  return whenValueMatches(value, isNotArrayValue, fn);
}

/**
 * Run the provided callback when the value is truthy.
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => T} fn Callback invoked with the value.
 * @returns {T | null} Callback result or `null` when the input is falsy.
 * @template T
 */
export function whenTruthy(value, fn) {
  return when(
    Boolean(value),
    () => fn(value),
    () => null
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
  return when(condition, fn, () => null);
}

/**
 * Run the callback when the condition passes; otherwise return the fallback value.
 * @template T
 * @param {boolean} condition Gate determining whether to invoke the callback.
 * @param {() => T} fn Callback invoked when the condition passes.
 * @param {T} fallback Value returned when the condition fails.
 * @returns {T} Callback result or fallback value.
 */
export function whenOrDefault(condition, fn, fallback) {
  return when(condition, fn, () => fallback);
}

/**
 * Run the callback when the supplied predicate says the value is acceptable.
 * @template T
 * @param {unknown} value Candidate value.
 * @param {(value: unknown) => boolean} isRejected Predicate that identifies values to skip.
 * @param {(value: unknown) => T} fn Callback invoked when the value passes the predicate.
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
 * Return the provided function candidate when available, otherwise use the fallback.
 * @param {unknown} candidate Candidate value.
 * @param {() => Function} fallback Factory returning the fallback function.
 * @returns {Function} Callable derived from the candidate or fallback.
 */
export function functionOrFallback(candidate, fallback) {
  return returnFallbackValue(
    typeof candidate === 'function',
    candidate,
    fallback
  );
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
 * Normalize a numeric candidate, returning zero when the input is not a number.
 * @param {unknown} value Candidate numeric value.
 * @returns {number} Number when provided, otherwise zero.
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
  return returnFallbackValue(isFiniteNumericValue(value), value, () => 0);
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
