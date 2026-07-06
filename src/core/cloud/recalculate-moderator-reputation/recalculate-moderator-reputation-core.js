/**
 * @typedef {object} ModerationRatingRecord
 * @property {string} moderatorId Moderator who created the rating.
 * @property {string} variantId Rated page variant identifier.
 * @property {boolean} isApproved Rating value.
 */

/**
 * @typedef {object} ModeratorReputationRecord
 * @property {string} moderatorId Moderator identifier.
 * @property {number} reputation Cached reputation value.
 */

/**
 * Build a graph of moderator adjacency from shared moderation ratings.
 * @param {ModerationRatingRecord[]} ratings Ratings used to seed the graph.
 * @returns {Map<string, Map<string, number>>} Weighted adjacency map.
 */
export function buildModeratorGraph(ratings) {
  const ratingsByModerator = groupRatingsByModerator(ratings);
  const graph = new Map();

  for (const rating of ratings) {
    if (!graph.has(rating.moderatorId)) {
      graph.set(rating.moderatorId, new Map());
    }
  }

  const moderatorIds = Array.from(ratingsByModerator.keys());
  for (let leftIndex = 0; leftIndex < moderatorIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < moderatorIds.length;
      rightIndex += 1
    ) {
      const leftModeratorId = moderatorIds[leftIndex];
      const rightModeratorId = moderatorIds[rightIndex];
      const weight = calculateModeratorEdgeWeight(
        getRatingsOrEmpty(ratingsByModerator, leftModeratorId),
        getRatingsOrEmpty(ratingsByModerator, rightModeratorId)
      );

      if (weight === null) {
        continue;
      }

      connectGraphEdge(graph, leftModeratorId, rightModeratorId, weight);
      connectGraphEdge(graph, rightModeratorId, leftModeratorId, weight);
    }
  }

  return graph;
}

/**
 * Compute cached moderator reputations from a graph seeded by current ratings.
 * @param {ModerationRatingRecord[]} ratings Current moderation ratings.
 * @param {string} adminModeratorId Admin moderator identifier.
 * @returns {ModeratorReputationRecord[]} Ranked reputation cache entries.
 */
export function calculateModeratorReputations(ratings, adminModeratorId) {
  const graph = buildModeratorGraph(ratings);
  const distances = shortestPathDistances(graph, adminModeratorId);
  const moderatorIds = new Set([adminModeratorId, ...graph.keys()]);

  return Array.from(moderatorIds)
    .map(moderatorId => {
      const distance = distances.get(moderatorId);
      let finiteDistance = Infinity;
      if (typeof distance === 'number') {
        finiteDistance = distance;
      }

      return {
        moderatorId,
        reputation: calculateReputation(finiteDistance),
      };
    })
    .sort(compareModeratorReputations);
}

/**
 * Convert a shortest-path distance into the inverse reputation score.
 * @param {number} distance Shortest-path distance.
 * @returns {number} Reputation score in the range 0..1.
 */
export function calculateReputation(distance) {
  if (!Number.isFinite(distance)) {
    return 0;
  }

  return 1 / (1 + distance);
}

/**
 * Compute shortest-path distances from the admin moderator.
 * @param {Map<string, Map<string, number>>} graph Weighted adjacency map.
 * @param {string} adminModeratorId Admin moderator identifier.
 * @returns {Map<string, number>} Distances keyed by moderator id.
 */
export function shortestPathDistances(graph, adminModeratorId) {
  const distances = new Map([[adminModeratorId, 0]]);
  const visited = new Set();
  const queue = [{ moderatorId: adminModeratorId, distance: 0 }];

  while (queue.length > 0) {
    queue.sort((left, right) => left.distance - right.distance);
    const current = /** @type {{ moderatorId: string, distance: number }} */ (
      queue.shift()
    );

    if (visited.has(current.moderatorId)) {
      continue;
    }

    visited.add(current.moderatorId);

    const neighbors = graph.get(current.moderatorId) ?? new Map();
    for (const [neighborId, weight] of neighbors.entries()) {
      const nextDistance = current.distance + weight;
      const existingDistance = distances.get(neighborId);

      if (existingDistance !== undefined && existingDistance <= nextDistance) {
        continue;
      }

      distances.set(neighborId, nextDistance);
      queue.push({ moderatorId: neighborId, distance: nextDistance });
    }
  }

  return distances;
}

/**
 * Group ratings by moderator id.
 * @param {ModerationRatingRecord[]} ratings Ratings list.
 * @returns {Map<string, Map<string, boolean>>} Ratings grouped by moderator and keyed by variant.
 */
function groupRatingsByModerator(ratings) {
  const grouped = new Map();

  for (const rating of ratings) {
    const moderatorRatings = grouped.get(rating.moderatorId) ?? new Map();
    moderatorRatings.set(rating.variantId, rating.isApproved);
    grouped.set(rating.moderatorId, moderatorRatings);
  }

  return grouped;
}

/**
 * Compute a normalized Hamming-distance edge weight for two moderators.
 * @param {Map<string, boolean>} leftRatings Ratings for the left moderator keyed by variant.
 * @param {Map<string, boolean>} rightRatings Ratings for the right moderator keyed by variant.
 * @returns {number | null} Normalized disagreement weight or null when there is no shared overlap.
 */
function calculateModeratorEdgeWeight(leftRatings, rightRatings) {
  const sharedVariantIds = Array.from(leftRatings.keys()).filter(variantId =>
    rightRatings.has(variantId)
  );

  if (sharedVariantIds.length === 0) {
    return null;
  }

  let disagreementCount = 0;
  for (const variantId of sharedVariantIds) {
    if (leftRatings.get(variantId) !== rightRatings.get(variantId)) {
      disagreementCount += 1;
    }
  }

  return disagreementCount / sharedVariantIds.length;
}

/**
 * Add or update a weighted graph edge.
 * @param {Map<string, Map<string, number>>} graph Graph to update.
 * @param {string} sourceId Source moderator identifier.
 * @param {string} targetId Target moderator identifier.
 * @param {number} weight Edge weight.
 * @returns {void}
 */
/**
 * Add or update a weighted graph edge.
 * @param {Map<string, Map<string, number>>} graph Graph to update.
 * @param {string} sourceId Source moderator identifier.
 * @param {string} targetId Target moderator identifier.
 * @param {number} weight Edge weight.
 * @returns {void}
 */
function connectGraphEdge(graph, sourceId, targetId, weight) {
  const neighbors = graph.get(sourceId) ?? new Map();
  const existingWeight = neighbors.get(targetId);
  const nextWeight = getLowerWeight(existingWeight, weight);

  neighbors.set(targetId, nextWeight);
  graph.set(sourceId, neighbors);
}

/**
 * Resolve ratings for a moderator or fall back to an empty set.
 * @param {Map<string, Map<string, boolean>>} ratingsByModerator Grouped ratings.
 * @param {string} moderatorId Moderator identifier.
 * @returns {Map<string, boolean>} Ratings map for the moderator or empty map.
 */
function getRatingsOrEmpty(ratingsByModerator, moderatorId) {
  return ratingsByModerator.get(moderatorId) ?? new Map();
}

/**
 * Choose the lower of an existing edge weight and a new candidate.
 * @param {number | undefined} existingWeight Existing weight.
 * @param {number} candidateWeight Candidate weight.
 * @returns {number} Lower weight.
 */
function getLowerWeight(existingWeight, candidateWeight) {
  return Math.min(existingWeight ?? Number.POSITIVE_INFINITY, candidateWeight);
}

/**
 * Sort reputations by most important cache values first.
 * @param {ModeratorReputationRecord} left Left record.
 * @param {ModeratorReputationRecord} right Right record.
 * @returns {number} Sort order.
 */
function compareModeratorReputations(left, right) {
  if (left.reputation !== right.reputation) {
    return right.reputation - left.reputation;
  }

  return left.moderatorId.localeCompare(right.moderatorId);
}

/**
 * Seed moderator reputation documents with the latest cached scores.
 * @param {{ collection: (name: string) => { doc: (id: string) => { set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> } } }} db Firestore-like database.
 * @param {ModeratorReputationRecord[]} reputations Cached reputations to persist.
 * @param {{ updatedAt: unknown }} metadata Shared metadata for the write.
 * @returns {Promise<void>} Promise resolving when all reputation writes complete.
 */
export async function writeModeratorReputations(db, reputations, metadata) {
  await Promise.all(
    reputations.map(record =>
      db.collection('moderators').doc(record.moderatorId).set(
        {
          moderatorReputation: record.reputation,
          moderatorReputationUpdatedAt: metadata.updatedAt,
        },
        { merge: true }
      )
    )
  );
}

/**
 * Read all current moderation ratings from Firestore.
 * @param {{ collection: (name: string) => { get: () => Promise<{ docs: Array<{ data: () => unknown }> }> } }} db Firestore-like database.
 * @returns {Promise<ModerationRatingRecord[]>} Ratings ready for graph seeding.
 */
export async function fetchModerationRatings(db) {
  const snapshot = await db.collection('moderationRatings').get();

  return snapshot.docs
    .map(doc => /** @type {ModerationRatingRecord} */ (doc.data() ?? {}))
    .filter(isModerationRatingRecord);
}

/**
 * Determine whether a document contains the rating fields the graph needs.
 * @param {Record<string, unknown>} candidate Candidate record.
 * @returns {candidate is ModerationRatingRecord} True when the record is usable.
 */
/**
 * @param {Record<string, unknown>} candidate Candidate record.
 * @returns {candidate is ModerationRatingRecord} True when the record is usable.
 */
function isModerationRatingRecord(candidate) {
  return [
    typeof candidate.moderatorId === 'string' &&
      candidate.moderatorId.length > 0,
    typeof candidate.variantId === 'string' && candidate.variantId.length > 0,
    typeof candidate.isApproved === 'boolean',
  ].every(Boolean);
}

export const recalculateModeratorReputationTestOnly = {
  calculateModeratorEdgeWeight,
  connectGraphEdge,
  getLowerWeight,
  getRatingsOrEmpty,
};
