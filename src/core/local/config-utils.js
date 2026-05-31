/**
 * @param {unknown} value Candidate string.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
export function normalizeString(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {unknown} value Candidate number.
 * @param {number} fallback Fallback number.
 * @returns {number} Positive finite number or fallback.
 */
export function normalizePositiveNumber(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate non-negative integer.
 * @param {number} fallback Fallback number.
 * @returns {number} Non-negative integer or fallback.
 */
export function normalizeNonNegativeInteger(value, fallback) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

/**
 * @param {unknown} value Candidate path value.
 * @param {string} fallback Fallback path value.
 * @returns {string} Normalized path value.
 */
export function normalizePathValue(value, fallback) {
  return normalizeString(value, fallback);
}

/**
 * @param {unknown} value Candidate string array.
 * @param {string[]} fallback Fallback string array.
 * @returns {string[]} Normalized string array.
 */
export function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return [...fallback];
  }

  return normalized;
}
