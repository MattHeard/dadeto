// Shared utility functions for browser code.

import { when as coreWhen } from '../commonCore.js';

/**
 * Check that the value is an object, excluding `null` and arrays.
 * @param {*} val Candidate to inspect.
 * @returns {boolean} True when `val` is an ordinary object.
 */
function isNonNullNonArray(val) {
  return val !== null && !Array.isArray(val);
}

/**
 * Determine whether the input is a non-null object.
 * @param {*} val Candidate value.
 * @returns {boolean} True when `val` is an object suitable for property access.
 */
export function isObject(val) {
  return isNonNullNonArray(val) && typeof val === 'object';
}

/**
 * Evaluate a transform when a condition holds, otherwise return the fallback default.
 * @param {boolean} condition - Determines whether the transform should run.
 * @param {() => string} transform - Resolver invoked if the condition is true.
 * @param {string} [fallback] - Value returned when the condition is falsy.
 * @returns {string} Result of the transform when applied, or the fallback otherwise.
 */
export function withFallback(condition, transform, fallback = '') {
  return coreWhen(condition, transform, () => fallback);
}

/**
 * Build a value when a condition holds, otherwise return `null`.
 * @param {boolean} condition - Whether to invoke the builder.
 * @param {() => T} builder - Function that produces the desired value.
 * @returns {T | null} Builder output when the condition is true, otherwise `null`.
 * @template T
 */
export function buildWhen(condition, builder) {
  if (!condition) {
    return null;
  }

  return builder();
}

export { guardThen, tryOr, when } from '../commonCore.js';
