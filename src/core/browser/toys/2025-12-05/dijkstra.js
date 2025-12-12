import { isValidString } from '../../../common-core.js';
import { calculateEdgeWeight } from './edgeWeight.js';
import { isPlainObject } from '../browserToysCore.js';
import { guardThen } from '#core/browser/common';

const NO_PATH_DISTANCE = 1;

/**
 * Find the shortest path distance between a moderator and the admin using Dijkstra's algorithm.
 * @param {{ moderatorId: string, adminId: string, ratings: Record<string, Record<string, boolean>>, ignoredPageId?: string }} payload - Graph context.
 * @returns {number} Shortest distance in the range [0, 1].
 */
export function shortestDistanceToAdmin({
  moderatorId,
  adminId,
  ratings,
  ignoredPageId,
}) {
  if (!areIdsValid(moderatorId, adminId)) {
    return NO_PATH_DISTANCE;
  }

  return resolveDistance({
    moderatorId,
    adminId,
    ratings,
    ignoredPageId,
  });
}

/**
 * Resolve the distance once identifiers are confirmed.
 * @param {{ moderatorId: string, adminId: string, ratings: Record<string, Record<string, boolean>>, ignoredPageId?: string }} context - Search context.
 * @returns {number} Shortest discovered distance.
 */
function resolveDistance(context) {
  if (context.moderatorId === context.adminId) {
    return 0;
  }

  return runSearch(context);
}

/**
 * Execute Dijkstra's search for the provided context.
 * @param {{ moderatorId: string, adminId: string, ratings: Record<string, Record<string, boolean>>, ignoredPageId?: string }} context - Search context.
 * @returns {number} Shortest discovered distance.
 */
function runSearch(context) {
  const nodes = buildNodeList(
    context.ratings,
    context.moderatorId,
    context.adminId
  );
  const state = createInitialState(context.moderatorId);

  while (state.queue.length > 0) {
    processNextNode({ nodes, state, context });
  }

  return state.bestDistance;
}

/**
 * Process the next queued node and enqueue valid neighbors.
 * @param {{ nodes: string[], state: { visited: Set<string>, queue: Array<{id: string, distance: number}>, distances: Map<string, number>, bestDistance: number }, context: { moderatorId: string, adminId: string, ratings: Record<string, Record<string, boolean>>, ignoredPageId?: string } }} payload - Current search state.
 */
function processNextNode({ nodes, state, context }) {
  const current = dequeue(state.queue);
  const guards = createGuards({ current, state, context });
  const shouldSkip = guards.some(check => check());
  if (shouldSkip) {
    return;
  }

  enqueueNeighbors({
    nodes,
    current,
    ratings: context.ratings,
    queue: state.queue,
    distances: state.distances,
    bestDistance: state.bestDistance,
    ignoredPageId: context.ignoredPageId,
  });
}

/**
 * Build guard functions for the current node.
 * @param {{ current: { id: string, distance: number }, state: { visited: Set<string>, queue: Array<{id: string, distance: number}>, bestDistance: number }, context: { adminId: string } }} payload - Current processing context.
 * @returns {Array<() => boolean>} Guard functions that return true to skip neighbor exploration.
 */
function createGuards({ current, state, context }) {
  return [
    () => guardVisited(state.visited, current.id),
    () => guardAdmin(state, context.adminId, current),
    () => guardStopDistance(state, current.distance),
    () => guardBeyondLimit(current.distance),
  ];
}

/**
 * Skip already visited nodes while marking new ones.
 * @param {Set<string>} visited - Visited node set.
 * @param {string} nodeId - Current node identifier.
 * @returns {boolean} True when the node was already visited.
 */
function guardVisited(visited, nodeId) {
  if (visited.has(nodeId)) {
    return true;
  }
  visited.add(nodeId);
  return false;
}

/**
 * Update best distance when visiting the admin node.
 * @param {{ bestDistance: number, queue: Array<{id: string, distance: number}> }} state - Search state.
 * @param {string} adminId - Admin identifier.
 * @param {{ id: string, distance: number }} current - Current node.
 * @returns {boolean} True when the admin node was processed.
 */
function guardAdmin(state, adminId, current) {
  if (current.id !== adminId) {
    return false;
  }
  state.bestDistance = current.distance;
  state.queue.length = 0;
  return true;
}

/**
 * Halt exploration when no shorter paths are possible.
 * @param {{ bestDistance: number, queue: Array<{id: string, distance: number}> }} state - Search state.
 * @param {number} distance - Current node distance.
 * @returns {boolean} True when further exploration should stop.
 */
function guardStopDistance(state, distance) {
  return guardThen(distance >= state.bestDistance, () => {
    state.queue.length = 0;
  });
}

/**
 * Skip exploration when the path has reached the maximum distance.
 * @param {number} distance - Current node distance.
 * @returns {boolean} True when the distance meets or exceeds the limit.
 */
function guardBeyondLimit(distance) {
  return distance >= NO_PATH_DISTANCE;
}

/**
 * Enqueue all valid neighboring nodes.
 * @param {{ nodes: string[], current: { id: string, distance: number }, ratings: Record<string, Record<string, boolean>>, queue: Array<{id: string, distance: number}>, distances: Map<string, number>, bestDistance: number, ignoredPageId?: string }} payload - Neighbor exploration context.
 */
function enqueueNeighbors({
  nodes,
  current,
  ratings,
  queue,
  distances,
  bestDistance,
  ignoredPageId,
}) {
  nodes
    .filter(neighbor => neighbor !== current.id)
    .map(neighbor =>
      createNeighborEntry({
        current,
        neighbor,
        ratings,
        bestDistance,
        ignoredPageId,
      })
    )
    .filter(Boolean)
    .forEach(entry => enqueueIfImproved(entry, queue, distances));
}

/**
 * Create a neighbor entry when it represents a usable path.
 * @param {{ current: { id: string, distance: number }, neighbor: string, ratings: Record<string, Record<string, boolean>>, bestDistance: number, ignoredPageId?: string }} payload - Neighbor context.
 * @returns {{ id: string, distance: number }|null} Neighbor entry or null when invalid.
 */
function createNeighborEntry({
  current,
  neighbor,
  ratings,
  bestDistance,
  ignoredPageId,
}) {
  const weight = calculateEdgeWeight({
    moderatorA: current.id,
    moderatorB: neighbor,
    ratings,
    ignoredPageId,
  });
  const nextDistance = current.distance + weight;
  const guards = [
    () => weight >= NO_PATH_DISTANCE,
    () => nextDistance >= NO_PATH_DISTANCE,
    () => nextDistance >= bestDistance,
  ];
  if (guards.some(check => check())) {
    return null;
  }

  return { id: neighbor, distance: nextDistance };
}

/**
 * Enqueue a neighbor when it improves the known distance.
 * @param {{ id: string, distance: number }} entry - Neighbor entry.
 * @param {Array<{id: string, distance: number}>} queue - Queue to append to.
 * @param {Map<string, number>} distances - Known distance map.
 */
function enqueueIfImproved(entry, queue, distances) {
  if (hasShorterPath(distances, entry.id, entry.distance)) {
    return;
  }

  distances.set(entry.id, entry.distance);
  enqueue(queue, entry);
}

/**
 * Check whether a shorter path already exists for a node.
 * @param {Map<string, number>} distances - Known distance map.
 * @param {string} neighbor - Neighbor identifier.
 * @param {number} candidateDistance - Candidate distance.
 * @returns {boolean} True when an equal or shorter path already exists.
 */
function hasShorterPath(distances, neighbor, candidateDistance) {
  const previous = distances.get(neighbor);
  return previous !== undefined && previous <= candidateDistance;
}

/**
 * Dequeue the next item, maintaining priority order.
 * @param {Array<{id: string, distance: number}>} queue - Priority queue.
 * @returns {{ id: string, distance: number }} Next entry.
 */
function dequeue(queue) {
  queue.sort((first, second) => first.distance - second.distance);
  return queue.shift();
}

/**
 * Enqueue an entry onto the queue.
 * @param {Array<{id: string, distance: number}>} queue - Priority queue.
 * @param {{ id: string, distance: number }} entry - Entry to add.
 */
function enqueue(queue, entry) {
  queue.push(entry);
}

/**
 * Build a node list including ratings keys and required identifiers.
 * @param {unknown} ratings - Ratings map.
 * @param {string} moderatorId - Starting moderator identifier.
 * @param {string} adminId - Admin identifier.
 * @returns {string[]} Unique node identifiers.
 */
function buildNodeList(ratings, moderatorId, adminId) {
  const nodes = [];
  if (isPlainObject(ratings)) {
    nodes.push(...Object.keys(ratings));
  }
  nodes.push(moderatorId, adminId);
  return Array.from(new Set(nodes));
}

/**
 * Validate moderator and admin identifiers.
 * @param {string} moderatorId - Moderator identifier.
 * @param {string} adminId - Admin identifier.
 * @returns {boolean} True when both are valid.
 */
function areIdsValid(moderatorId, adminId) {
  return isValidString(moderatorId) && isValidString(adminId);
}

/**
 * Initialize the search state.
 * @param {string} moderatorId - Starting moderator identifier.
 * @returns {{ visited: Set<string>, queue: Array<{id: string, distance: number}>, distances: Map<string, number>, bestDistance: number }} Initial state.
 */
function createInitialState(moderatorId) {
  return {
    visited: new Set(),
    queue: [{ id: moderatorId, distance: 0 }],
    distances: new Map([[moderatorId, 0]]),
    bestDistance: NO_PATH_DISTANCE,
  };
}

/**
 * Check whether a value is a plain object.
 * @param {unknown} value - Value to test.
 * @returns {boolean} True when the value is a non-array object.
 */
export { guardStopDistance };
