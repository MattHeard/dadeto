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
 * @param {object} options - Configuration options
 * @param {boolean} [options.isDouble] - Whether to use double markers
 * @param {string} [options.flags] - Regex flags
 * @param isDouble
 * @returns {RegExp} The compiled regular expression
 */
const computeActualMarker = (marker, isDouble) => {
  const escaped = escapeRegex(marker);
  if (isDouble) {
    return `${escaped}{2}`;
  }
  return escaped;
};

/**
 *
 * @param options
 */
function normalizePatternOptions(options = {}) {
  return { isDouble: false, flags: 'g', ...options };
}

/**
 *
 * @param marker
 * @param options
 */
export function createPattern(marker, options) {
  const { isDouble, flags } = normalizePatternOptions(options);
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
