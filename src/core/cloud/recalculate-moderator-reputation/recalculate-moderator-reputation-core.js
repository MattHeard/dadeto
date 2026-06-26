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
  const ratingsByVariant = groupRatingsByVariant(ratings);
  const graph = new Map();

  for (const rating of ratings) {
    ensureGraphNode(graph, rating.moderatorId);
  }

  for (const variantRatings of ratingsByVariant.values()) {
    connectVariantModerators(graph, variantRatings);
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

  return Array.from(graph.keys())
    .map(moderatorId => {
      const distance = distances.get(moderatorId);
      const finiteDistance = typeof distance === 'number' ? distance : Infinity;

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
 * Group ratings by variant id.
 * @param {ModerationRatingRecord[]} ratings Ratings list.
 * @returns {Map<string, ModerationRatingRecord[]>} Ratings grouped by variant.
 */
function groupRatingsByVariant(ratings) {
  const grouped = new Map();

  for (const rating of ratings) {
    const variantRatings = grouped.get(rating.variantId) ?? [];
    variantRatings.push(rating);
    grouped.set(rating.variantId, variantRatings);
  }

  return grouped;
}

/**
 * Connect moderators that rated the same page with hamming-distance edge weights.
 * @param {Map<string, Map<string, number>>} graph Graph to update.
 * @param {ModerationRatingRecord[]} ratings Ratings for one shared variant.
 * @returns {void}
 */
function connectVariantModerators(graph, ratings) {
  for (let leftIndex = 0; leftIndex < ratings.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ratings.length; rightIndex += 1) {
      const left = ratings[leftIndex];
      const right = ratings[rightIndex];
      const weight = left.isApproved === right.isApproved ? 0 : 1;

      connectGraphEdge(graph, left.moderatorId, right.moderatorId, weight);
      connectGraphEdge(graph, right.moderatorId, left.moderatorId, weight);
    }
  }
}

/**
 * Add or update a weighted graph edge.
 * @param {Map<string, Map<string, number>>} graph Graph to update.
 * @param {string} sourceId Source moderator identifier.
 * @param {string} targetId Target moderator identifier.
 * @param {number} weight Edge weight.
 * @returns {void}
 */
/* istanbul ignore next */
function connectGraphEdge(graph, sourceId, targetId, weight) {
  const neighbors = graph.get(sourceId) ?? new Map();
  const existingWeight = neighbors.get(targetId);
  const nextWeight = Math.min(
    existingWeight ?? Number.POSITIVE_INFINITY,
    weight
  );

  neighbors.set(targetId, nextWeight);
  graph.set(sourceId, neighbors);
}

/**
 * Ensure a moderator node exists in the graph.
 * @param {Map<string, Map<string, number>>} graph Graph to update.
 * @param {string} moderatorId Moderator identifier.
 * @returns {void}
 */
function ensureGraphNode(graph, moderatorId) {
  if (!graph.has(moderatorId)) {
    graph.set(moderatorId, new Map());
  }
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
 * @param {{ collection: (name: string) => { doc: (id: string) => { set: (data: Record<string, unknown>) => Promise<void> } } }} db Firestore-like database.
 * @param {ModeratorReputationRecord[]} reputations Cached reputations to persist.
 * @param {{ updatedAt: unknown }} metadata Shared metadata for the write.
 * @returns {Promise<void>} Promise resolving when all reputation writes complete.
 */
export async function writeModeratorReputations(db, reputations, metadata) {
  await Promise.all(
    reputations.map(record =>
      db.collection('moderators').doc(record.moderatorId).set({
        moderatorReputation: record.reputation,
        moderatorReputationUpdatedAt: metadata.updatedAt,
      })
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
    .map(doc => /** @type {Record<string, unknown>} */ (doc.data() ?? {}))
    .filter(isModerationRatingRecord);
}

/**
 * Determine whether a document contains the rating fields the graph needs.
 * @param {Record<string, unknown>} candidate Candidate record.
 * @returns {candidate is ModerationRatingRecord} True when the record is usable.
 */
/* istanbul ignore next */
function isModerationRatingRecord(candidate) {
  return [
    typeof candidate.moderatorId === 'string' &&
      candidate.moderatorId.length > 0,
    typeof candidate.variantId === 'string' && candidate.variantId.length > 0,
    typeof candidate.isApproved === 'boolean',
  ].every(Boolean);
}
