const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\-]/g;

/**
 * Escapes special regex characters in a string
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeRegex(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

/**
 * Creates a regex pattern for matching text between markers
 * @param {string} marker - The marker character(s) to match between
 * @param {Object} options - Configuration options
 * @param {boolean} [options.isDouble=false] - Whether to use double markers
 * @param {string} [options.flags='g'] - Regex flags
 * @returns {RegExp} The compiled regular expression
 */
const computeActualMarker = (marker, isDouble) => {
  const escaped = escapeRegex(marker);
  return isDouble ? `${escaped}{2}` : escaped;
};

export function createPattern(marker, { isDouble = false, flags = 'g' } = {}) {
  const actualMarker = computeActualMarker(marker, isDouble);
  return new RegExp(`${actualMarker}(.*?)${actualMarker}`, flags);
}

/**
 * Tests if a string matches a pattern
 * @param {string} str - The string to test
 * @param {RegExp} pattern - The pattern to test against
 * @returns {boolean} True if the string matches the pattern
 */
export function matchesPattern(str, pattern) {
  return pattern.test(str);
}
