import { isValidString, whenString } from '../../../common-core.js';
import { when } from '#core/browser/common';
import { parseJsonOrFallback, isPlainObject } from '../browserToysCore.js';
import { shortestDistanceToAdmin } from './dijkstra.js';

const DEFAULT_VISIBILITY = '1';
const NO_PATH_DISTANCE = 1;

/**
 * Calculate the visibility score for a Dendrite page.
 * @param {string} input - JSON string containing pageId, adminId, and ratings.
 * @returns {string} Visibility score between "0" and "1".
 */
export function calculateVisibility(input) {
  const parsed = parseInput(input);
  return resolveParsedResult(parsed);
}

/**
 * Resolve visibility once input has been parsed.
 * @param {{ pageId: string, adminId: string, ratings: object } | null} parsed - Parsed payload or null.
 * @returns {string} Visibility score or fallback.
 */
function resolveParsedResult(parsed) {
  if (!parsed) {
    return DEFAULT_VISIBILITY;
  }
  return determineVisibility(parsed);
}

/**
 * Resolve the visibility outcome once input has been parsed.
 * @param {{ pageId: string, adminId: string, ratings: object }} payload - Parsed payload.
 * @returns {string} Visibility score.
 */
function determineVisibility({ pageId, adminId, ratings }) {
  if (!areIdentifiersValid(pageId, adminId)) {
    return DEFAULT_VISIBILITY;
  }

  return resolveWithNormalized({ pageId, adminId, ratings });
}

/**
 * Apply admin overrides and moderator calculations with normalized data.
 * @param {{ pageId: string, adminId: string, ratings: object }} payload - Validated payload.
 * @returns {string} Visibility score.
 */
function resolveWithNormalized({ pageId, adminId, ratings }) {
  const normalizedRatings = normalizeRatings(ratings, adminId);
  const adminDecision = getAdminDecision(normalizedRatings, adminId, pageId);
  if (adminDecision) {
    return adminDecision;
  }

  return resolveFromModerators({
    pageId,
    adminId,
    ratings: normalizedRatings,
  });
}

/**
 * Handle moderator-driven scoring when no admin override applies.
 * @param {{ pageId: string, adminId: string, ratings: Record<string, Record<string, boolean>> }} payload - Normalized inputs.
 * @returns {string} Visibility score.
 */
function resolveFromModerators({ pageId, adminId, ratings }) {
  const pageRatings = collectPageRatings(ratings, pageId, adminId);
  const emptyResult = resolveEmptyRatings(pageRatings);
  if (emptyResult) {
    return emptyResult;
  }

  return resolveNonEmptyRatings({ pageRatings, adminId, ratings, pageId });
}

/**
 * Return the default score when no moderator ratings exist.
 * @param {Array<{ moderatorId: string, approved: boolean }>} pageRatings - Ratings for the page.
 * @returns {string|null} Default score when applicable.
 */
function resolveEmptyRatings(pageRatings) {
  if (pageRatings.length === 0) {
    return DEFAULT_VISIBILITY;
  }
  return null;
}

/**
 * Handle single or multiple moderator ratings.
 * @param {{ pageRatings: Array<{ moderatorId: string, approved: boolean }>, adminId: string, ratings: Record<string, Record<string, boolean>>, pageId: string }} payload - Ratings context.
 * @returns {string} Visibility score.
 */
function resolveNonEmptyRatings(payload) {
  const { pageRatings } = payload;

  return when(
    pageRatings.length === 1,
    () => mapBooleanToVisibility(pageRatings[0].approved),
    () => deriveWeightedScore(payload)
  );
}

/**
 * Compute the weighted score when multiple ratings exist.
 * @param {{ pageRatings: Array<{ moderatorId: string, approved: boolean }>, adminId: string, ratings: Record<string, Record<string, boolean>>, pageId: string }} payload - Ratings context.
 * @returns {string} Visibility score.
 */
function deriveWeightedScore({ pageRatings, adminId, ratings, pageId }) {
  const totals = calculateWeightedScore({
    pageRatings,
    adminId,
    ratings,
    pageId,
  });

  if (totals.totalWeight === 0) {
    return DEFAULT_VISIBILITY;
  }

  const score = totals.weightedSum / totals.totalWeight;
  return String(score);
}

/**
 * Parse incoming JSON safely.
 * @param {unknown} input - Raw input value.
 * @returns {object|null} Parsed object or null on failure.
 */
function parseInput(input) {
  return whenString(input, parseJsonOrFallback);
}

/**
 * Validate payload identifiers.
 * @param {string} pageId - Target page identifier.
 * @param {string} adminId - Admin identifier.
 * @returns {boolean} True when both identifiers are valid strings.
 */
function areIdentifiersValid(pageId, adminId) {
  return isValidString(pageId) && isValidString(adminId);
}

/**
 * Normalize incoming ratings into plain objects keyed by moderator.
 * @param {unknown} ratings - Raw ratings object.
 * @param {string} adminId - Admin identifier.
 * @returns {Record<string, Record<string, boolean>>} Normalized ratings.
 */
function normalizeRatings(ratings, adminId) {
  const normalized = {};
  if (isPlainObject(ratings)) {
    Object.assign(normalized, mapModeratorRatings(ratings));
  }
  ensureAdminEntry(normalized, adminId);
  return normalized;
}

/**
 * Map moderator rating entries into sanitized objects.
 * @param {Record<string, unknown>} ratings - Raw ratings keyed by moderator.
 * @returns {Record<string, Record<string, boolean>>} Sanitized ratings.
 */
function mapModeratorRatings(ratings) {
  return Object.entries(ratings).reduce(
    (acc, [moderatorId, moderatorRatings]) =>
      assignModeratorRatings(acc, moderatorId, moderatorRatings),
    {}
  );
}

/**
 * Assign sanitized ratings for a moderator.
 * @param {Record<string, Record<string, boolean>>} acc - Accumulated ratings.
 * @param {string} moderatorId - Moderator identifier.
 * @param {unknown} moderatorRatings - Raw ratings for the moderator.
 * @returns {Record<string, Record<string, boolean>>} Updated accumulator.
 */
function assignModeratorRatings(acc, moderatorId, moderatorRatings) {
  acc[moderatorId] = sanitizeRatings(moderatorRatings);
  return acc;
}

/**
 * Ensure an admin entry exists in the ratings map.
 * @param {Record<string, Record<string, boolean>>} normalized - Normalized ratings.
 * @param {string} adminId - Admin identifier.
 */
function ensureAdminEntry(normalized, adminId) {
  if (!Object.hasOwn(normalized, adminId)) {
    normalized[adminId] = {};
  }
}

/**
 * Convert raw moderator ratings into a sanitized object.
 * @param {unknown} moderatorRatings - Raw moderator ratings.
 * @returns {Record<string, boolean>} Sanitized ratings.
 */
function sanitizeRatings(moderatorRatings) {
  if (!isPlainObject(moderatorRatings)) {
    return {};
  }

  return Object.entries(moderatorRatings).reduce(
    (acc, [pageId, value]) => assignPageRating(acc, pageId, value),
    {}
  );
}

/**
 * Assign a page rating when the value is boolean.
 * @param {Record<string, boolean>} acc - Accumulated ratings.
 * @param {string} pageId - Page identifier.
 * @param {unknown} value - Rating value.
 * @returns {Record<string, boolean>} Updated accumulator.
 */
function assignPageRating(acc, pageId, value) {
  if (typeof value === 'boolean') {
    acc[pageId] = value;
  }
  return acc;
}

/**
 * Resolve the admin override when a rating exists.
 * @param {Record<string, Record<string, boolean>>} ratings - Normalized ratings map.
 * @param {string} adminId - Admin identifier.
 * @param {string} pageId - Target page identifier.
 * @returns {string|null} Admin decision as a string, or null when none exists.
 */
function getAdminDecision(ratings, adminId, pageId) {
  if (!hasAdminRating(ratings, adminId, pageId)) {
    return null;
  }

  const adminRatings = ratings[adminId];
  return mapBooleanToVisibility(adminRatings[pageId]);
}

/**
 * Return the raw rating map for the specified admin, defaulting to an empty object.
 * @param {Record<string, Record<string, boolean>>} ratings - Normalized ratings map.
 * @param {string} adminId - Admin identifier.
 * @returns {Record<string, boolean>} Rating map for the admin.
 */
function getAdminRatings(ratings, adminId) {
  const adminRatings = ratings[adminId];
  return adminRatings ?? {};
}

/**
 * Check whether the admin has rated the page.
 * @param {Record<string, Record<string, boolean>>} ratings - Normalized ratings map.
 * @param {string} adminId - Admin identifier.
 * @param {string} pageId - Target page identifier.
 * @returns {boolean} True when a rating exists.
 */
function hasAdminRating(ratings, adminId, pageId) {
  return Object.hasOwn(getAdminRatings(ratings, adminId), pageId);
}

/**
 * Collect ratings for the target page excluding the admin.
 * @param {Record<string, Record<string, boolean>>} ratings - Normalized ratings map.
 * @param {string} pageId - Target page identifier.
 * @param {string} adminId - Admin identifier.
 * @returns {Array<{ moderatorId: string, approved: boolean }>} Page ratings.
 */
function collectPageRatings(ratings, pageId, adminId) {
  return Object.entries(ratings)
    .filter(([moderatorId]) => moderatorId !== adminId)
    .map(([moderatorId, moderatorRatings]) => ({
      moderatorId,
      approved: moderatorRatings?.[pageId],
    }))
    .filter(entry => typeof entry.approved === 'boolean');
}

/**
 * Calculate weighted sums based on moderator influences.
 * @param {{ pageRatings: Array<{ moderatorId: string, approved: boolean }>, adminId: string, ratings: Record<string, Record<string, boolean>>, pageId: string }} payload - Ratings context.
 * @returns {{ weightedSum: number, totalWeight: number }} Weighted totals.
 */
function calculateWeightedScore({ pageRatings, adminId, ratings, pageId }) {
  return pageRatings.reduce(
    (totals, rating) => {
      const distance = clampDistance(
        shortestDistanceToAdmin({
          moderatorId: rating.moderatorId,
          adminId,
          ratings,
          ignoredPageId: pageId,
        })
      );
      const influence = 1 - distance;

      return updateTotals(totals, influence, rating.approved);
    },
    { weightedSum: 0, totalWeight: 0 }
  );
}

/**
 * Update weighted totals with the provided rating.
 * @param {{ weightedSum: number, totalWeight: number }} totals - Running totals.
 * @param {number} influence - Influence for the rating.
 * @param {boolean} approved - Whether the rating is an approval.
 * @returns {{ weightedSum: number, totalWeight: number }} Updated totals.
 */
function updateTotals(totals, influence, approved) {
  const weightedSum = accumulateWeightedSum(
    totals.weightedSum,
    influence,
    approved
  );
  const totalWeight = totals.totalWeight + influence;
  return { weightedSum, totalWeight };
}

/**
 * Accumulate the weighted sum when approved.
 * @param {number} currentSum - Existing weighted sum.
 * @param {number} influence - Influence for the rating.
 * @param {boolean} approved - Whether the rating is an approval.
 * @returns {number} New weighted sum.
 */
function accumulateWeightedSum(currentSum, influence, approved) {
  if (approved) {
    return currentSum + influence;
  }
  return currentSum;
}

/**
 * Map a boolean rating to a string visibility value.
 * @param {boolean} value - Rating value.
 * @returns {string} "1" for approved, "0" for rejected.
 */
function mapBooleanToVisibility(value) {
  if (value) {
    return '1';
  }
  return '0';
}

/**
 * Clamp the computed distance into the valid range.
 * @param {number} distance - Computed distance.
 * @returns {number} Distance in [0, 1].
 */
export function clampDistance(distance) {
  if (!Number.isFinite(distance)) {
    return NO_PATH_DISTANCE;
  }

  const capped = Math.min(NO_PATH_DISTANCE, distance);
  return Math.max(0, capped);
}

/**
 * Check whether a value is a plain object.
 * @param {unknown} value - Value to check.
 * @returns {boolean} True when the value is a non-array object.
 */
export { hasAdminRating };
