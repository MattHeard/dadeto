/**
 * @param {{
 *   previousExponent?: number | null,
 *   initialExponent: number,
 *   maxExponent: number
 * }} options Backoff exponent input.
 * @returns {number} Next idle exponent.
 */
export function getNextIdleBackoffExponent(options) {
  if (!Number.isInteger(options.previousExponent)) {
    return clampExponent(options.initialExponent, options);
  }

  return clampExponent(options.previousExponent + 1, options);
}

/**
 * @param {{
 *   exponent: number,
 *   baseDelayMs: number,
 *   initialExponent: number,
 *   maxExponent: number
 * }} options Backoff delay input.
 * @returns {number} Delay in milliseconds.
 */
export function getBinaryBackoffDelayMs(options) {
  const exponent = clampExponent(options.exponent, options);
  return options.baseDelayMs * 2 ** exponent;
}

/**
 * @param {{ now: Date, delayMs: number }} options Schedule input.
 * @returns {string} ISO timestamp for the next poll.
 */
export function getNextPollAfterIso(options) {
  return new Date(options.now.getTime() + options.delayMs).toISOString();
}

/**
 * Clamp a backoff exponent to the configured bounds.
 * @param {number} exponent Candidate exponent.
 * @param {{
 *   initialExponent: number,
 *   maxExponent: number
 * }} options Backoff bounds.
 * @returns {number} Clamped exponent.
 */
function clampExponent(exponent, options) {
  let min = 0;
  if (Number.isInteger(options.initialExponent)) {
    min = options.initialExponent;
  }

  let max = min;
  if (Number.isInteger(options.maxExponent)) {
    max = options.maxExponent;
  }

  return Math.min(Math.max(exponent, min), max);
}
