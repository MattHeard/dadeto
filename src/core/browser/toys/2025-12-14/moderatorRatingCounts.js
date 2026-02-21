import { parseJsonOrFallback } from '../browserToysCore.js';
import { whenString } from '../../../commonCore.js';

/**
 * @typedef {{ isApproved: boolean, moderatorId: string, ratedAt: string, variantId: string }} ModeratorRatingEntry
 */

const REQUIRED_FIELDS = ['isApproved', 'moderatorId', 'ratedAt', 'variantId'];

/**
 * Produce the moderator count summary as a JSON string.
 * @param {string} input - JSON payload containing rating entries.
 * @returns {string} JSON array of { moderatorId, count } records.
 */
export function moderatorRatingCounts(input) {
  const ratings = parseRatings(input);
  const counts = countModeratorRatings(
    /** @type {Array<ModeratorRatingEntry>} */ (ratings)
  );
  return JSON.stringify(buildResultArray(counts));
}

/**
 * Build a map of moderators to the number of valid ratings submitted.
 * @param {Array<ModeratorRatingEntry>} ratings - Parsed rating entries.
 * @returns {Map<string, number>} Moderators mapped to their counts.
 */
function countModeratorRatings(ratings) {
  const counts = /** @type {Map<string, number>} */ (new Map());

  for (const rating of getValidRatings(ratings)) {
    incrementCount(counts, rating.moderatorId);
  }

  return counts;
}

/**
 * Filter the provided array to return only schema-compliant entries.
 * @param {Array<unknown>} ratings - Parsed rating entries.
 * @returns {Array<ModeratorRatingEntry>} Valid rating objects.
 */
function getValidRatings(ratings) {
  return /** @type {Array<ModeratorRatingEntry>} */ (
    ratings.filter(isValidRating)
  );
}

/**
 * Add one to the moderator's count.
 * @param {Map<string, number>} counts - Accumulated counts.
 * @param {string} moderatorId - Moderator identifier.
 * @returns {void}
 */
function incrementCount(counts, moderatorId) {
  const previous = getCountValue(counts, moderatorId);
  counts.set(moderatorId, previous + 1);
}

/**
 * Resolve the previous count or zero.
 * @param {Map<string, number>} counts - Accumulated counts.
 * @param {string} moderatorId - Moderator identifier.
 * @returns {number} Existing count or zero.
 */
function getCountValue(counts, moderatorId) {
  const existing = counts.get(moderatorId);
  if (typeof existing === 'number') {
    return existing;
  }

  return 0;
}

/**
 * Parse the toy input as an array, defaulting to an empty list on failure.
 * @param {*} value - Raw input value from the toy UI.
 * @returns {Array<unknown>} Array of parsed entries or an empty array.
 */
function parseRatings(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return ensureArray(parseJsonOrFallback(value, []));
}

/**
 * Guarantee the parsed value is an array before returning it.
 * @param {*} parsed - Result of the JSON parser.
 * @returns {Array<unknown>} Valid array or empty array.
 */
function ensureArray(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  return [];
}

/**
 * Format the counts map as the requested output array.
 * @param {Map<string, number>} counts - Map produced by `countModeratorRatings`.
 * @returns {Array<{moderatorId: string, count: number}>} Output payload.
 */
function buildResultArray(counts) {
  return Array.from(counts, ([moderatorId, count]) => ({
    moderatorId,
    count,
  }));
}

/**
 * Verify that the candidate satisfies the rating schema.
 * @param {*} candidate - Entry parsed from the input array.
 * @returns {candidate is ModeratorRatingEntry} True when the entry contains valid fields.
 */
function isValidRating(candidate) {
  if (!isPlainObject(candidate)) {
    return false;
  }

  return hasValidShape(/** @type {Record<string, unknown>} */ (candidate));
}

/**
 * Confirm the entry declares the required fields and the expected types.
 * @param {Record<string, unknown>} candidate - Object validated by `isPlainObject`.
 * @returns {candidate is ModeratorRatingEntry} True when the shape matches the schema.
 */
function hasValidShape(candidate) {
  return hasRequiredFields(candidate) && hasValidTypes(candidate);
}

/**
 * Verify the parsed entry stores the expected primitive types.
 * @param {Record<string, unknown>} candidate - Entry that already has the required fields.
 * @returns {candidate is ModeratorRatingEntry} True when every field matches its expected type.
 */
function hasValidTypes(candidate) {
  const checks = [
    typeof candidate.isApproved === 'boolean',
    typeof candidate.moderatorId === 'string',
    isIso8601String(candidate.ratedAt),
    typeof candidate.variantId === 'string',
  ];
  return checks.every(Boolean);
}

/**
 * Ensure each required field is present on the entry.
 * @param {Record<string, unknown>} candidate - Rating entry confirmed to be an object.
 * @returns {boolean} True when every required key exists.
 */
function hasRequiredFields(candidate) {
  return REQUIRED_FIELDS.every(field => field in candidate);
}

/**
 * Detect plain objects, excluding arrays and null.
 * @param {*} value - Value to inspect.
 * @returns {boolean} True when the value is a plain object.
 */
function isPlainObject(value) {
  return Boolean(value && value.constructor === Object);
}

/**
 * Confirm the timestamp parses as ISO 8601.
 * @param {*} value - Value stored on `ratedAt`.
 * @returns {boolean} True when the string can be parsed as a date.
 */
function isIso8601String(value) {
  return (
    whenString(value, candidate => {
      const parsed = Date.parse(candidate);
      return !Number.isNaN(parsed);
    }) ?? false
  );
}
