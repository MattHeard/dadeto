import { isValidString } from '../../../commonCore.js';

const NO_CONNECTION_WEIGHT = 1;

/**
 * Calculate the edge weight between two moderators based on rating overlap.
 * Weight ranges from 0 (perfect agreement) to 1 (no agreement or overlap).
 * @param {{ moderatorA: string, moderatorB: string, ratings: Record<string, Record<string, boolean>>, ignoredPageId?: string }} payload - Edge calculation context.
 * @returns {number} Edge weight between the two moderators.
 */
export function calculateEdgeWeight({
  moderatorA,
  moderatorB,
  ratings,
  ignoredPageId,
}) {
  const ratingPair = extractRatingsPair({ moderatorA, moderatorB, ratings });
  if (!ratingPair) {
    return NO_CONNECTION_WEIGHT;
  }

  return deriveWeight({
    ...ratingPair,
    ignoredPageId,
  });
}

/**
 * Extract usable rating objects for a moderator pair.
 * @param {{ moderatorA: string, moderatorB: string, ratings: Record<string, Record<string, boolean>> }} payload - Moderator pair context.
 * @returns {{ firstRatings: Record<string, boolean>, secondRatings: Record<string, boolean> }|null} Ratings pair when valid.
 */
function extractRatingsPair({ moderatorA, moderatorB, ratings }) {
  if (!areModeratorIdsValid(moderatorA, moderatorB)) {
    return null;
  }

  return buildRatingsPair(ratings, moderatorA, moderatorB);
}

/**
 * Build a rating pair when moderator data is valid.
 * @param {Record<string, Record<string, boolean>>} ratings - Ratings keyed by moderator.
 * @param {string} moderatorA - First moderator identifier.
 * @param {string} moderatorB - Second moderator identifier.
 * @returns {{ firstRatings: Record<string, boolean>, secondRatings: Record<string, boolean> }|null} Ratings pair when usable.
 */
function buildRatingsPair(ratings, moderatorA, moderatorB) {
  const firstRatings = getModeratorRatings(ratings, moderatorA);
  if (!firstRatings) {
    return null;
  }

  return buildSecondRatingsPair(firstRatings, ratings, moderatorB);
}

/**
 * Build the second moderator's ratings once the first is confirmed.
 * @param {Record<string, boolean>} firstRatings First moderator ratings.
 * @param {Record<string, Record<string, boolean>>} ratings All ratings keyed by moderator.
 * @param {string} moderatorB Second moderator identifier.
 * @returns {{ firstRatings: Record<string, boolean>, secondRatings: Record<string, boolean> }|null} Pair when both moderators exist.
 */
function buildSecondRatingsPair(firstRatings, ratings, moderatorB) {
  const secondRatings = getModeratorRatings(ratings, moderatorB);
  if (!secondRatings) {
    return null;
  }

  return {
    firstRatings,
    secondRatings,
  };
}

/**
 * Retrieve ratings for a specific moderator when present.
 * @param {Record<string, Record<string, boolean>>} ratings - Ratings keyed by moderator.
 * @param {string} moderatorId - Moderator identifier.
 * @returns {Record<string, boolean>|null} Ratings object or null when missing.
 */
function getModeratorRatings(ratings, moderatorId) {
  if (!hasModeratorEntry(ratings, moderatorId)) {
    return null;
  }
  return ratings[moderatorId];
}

/**
 * Determine whether ratings include the moderator entry.
 * @param {Record<string, Record<string, boolean>>|null|undefined} ratings - Ratings keyed by moderator.
 * @param {string} moderatorId - Moderator identifier.
 * @returns {boolean} True when the entry exists.
 */
function hasModeratorEntry(ratings, moderatorId) {
  return (
    Boolean(ratings) &&
    Object.prototype.hasOwnProperty.call(ratings, moderatorId)
  );
}

/**
 * Derive the edge weight when ratings are available.
 * @param {{ firstRatings: Record<string, boolean>, secondRatings: Record<string, boolean>, ignoredPageId?: string }} payload - Ratings with optional ignored page.
 * @returns {number} Weight between the moderators.
 */
function deriveWeight({ firstRatings, secondRatings, ignoredPageId }) {
  const overlap = getOverlap(firstRatings, secondRatings, ignoredPageId);
  if (overlap.length === 0) {
    return NO_CONNECTION_WEIGHT;
  }

  return finalizeWeight(overlap, firstRatings, secondRatings);
}

/**
 * Compute the final weight based on agreements.
 * @param {string[]} overlap - Pages rated by both moderators.
 * @param {Record<string, boolean>} firstRatings - First moderator ratings.
 * @param {Record<string, boolean>} secondRatings - Second moderator ratings.
 * @returns {number} Edge weight value.
 */
function finalizeWeight(overlap, firstRatings, secondRatings) {
  const agreements = countAgreements(overlap, firstRatings, secondRatings);
  return 1 - agreements / overlap.length;
}

/**
 * Validate moderator identifiers.
 * @param {string} moderatorA - First moderator identifier.
 * @param {string} moderatorB - Second moderator identifier.
 * @returns {boolean} True when both identifiers are valid.
 */
function areModeratorIdsValid(moderatorA, moderatorB) {
  return isValidString(moderatorA) && isValidString(moderatorB);
}

/**
 * Determine the overlapping rated pages between two moderators.
 * @param {Record<string, boolean>} firstRatings - First moderator ratings.
 * @param {Record<string, boolean>} secondRatings - Second moderator ratings.
 * @param {string} [ignoredPageId] - Optional page to exclude.
 * @returns {string[]} Overlapping page identifiers.
 */
function getOverlap(firstRatings, secondRatings, ignoredPageId) {
  return Object.keys(firstRatings).filter(
    pageId =>
      !shouldIgnorePage(pageId, ignoredPageId) &&
      Object.prototype.hasOwnProperty.call(secondRatings, pageId)
  );
}

/**
 * Count agreements across overlapping ratings.
 * @param {string[]} overlap - Overlapping page identifiers.
 * @param {Record<string, boolean>} firstRatings - First moderator ratings.
 * @param {Record<string, boolean>} secondRatings - Second moderator ratings.
 * @returns {number} Agreement count.
 */
function countAgreements(overlap, firstRatings, secondRatings) {
  return overlap.filter(
    pageId => firstRatings[pageId] === secondRatings[pageId]
  ).length;
}

/**
 * Decide whether to ignore a page in edge calculations.
 * @param {string} pageId - Page identifier under test.
 * @param {string} [ignoredPageId] - Page identifier to skip.
 * @returns {boolean} True when the page should be ignored.
 */
function shouldIgnorePage(pageId, ignoredPageId) {
  return Boolean(ignoredPageId) && pageId === ignoredPageId;
}
