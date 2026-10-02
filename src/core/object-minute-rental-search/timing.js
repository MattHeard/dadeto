/**
 * Convert a typed duration to the epoch-millisecond unit used by placement math.
 * @param {number} seconds Duration in seconds.
 * @returns {number} Duration in milliseconds.
 */
export function durationMilliseconds(seconds) {
  return seconds * 1000;
}
