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
  return options.baseDelayMs * (2 ** exponent);
}

/**
 * @param {{ now: Date, delayMs: number }} options Schedule input.
 * @returns {string} ISO timestamp for the next poll.
 */
export function getNextPollAfterIso(options) {
  return new Date(options.now.getTime() + options.delayMs).toISOString();
}

function clampExponent(exponent, options) {
  const min = Number.isInteger(options.initialExponent) ? options.initialExponent : 0;
  const max = Number.isInteger(options.maxExponent) ? options.maxExponent : min;
  return Math.min(Math.max(exponent, min), max);
}
