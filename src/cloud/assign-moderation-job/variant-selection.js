/**
 * @typedef {object} VariantQueryDescriptor
 * @property {"zeroRated"|"any"} reputation Reputation filter applied to the query.
 * @property {">="|"<"} comparator Comparison operator applied to the random value.
 * @property {number} randomValue Random value that seeds the Firestore cursor.
 */

/**
 * Describe the queries used to fetch a moderation candidate.
 * @param {number} randomValue Random value that seeds the Firestore cursor.
 * @returns {VariantQueryDescriptor[]} Ordered query descriptors.
 */
export function buildVariantQueryPlan(randomValue) {
  return [
    {
      reputation: 'zeroRated',
      comparator: '>=',
      randomValue,
    },
    {
      reputation: 'zeroRated',
      comparator: '<',
      randomValue,
    },
    {
      reputation: 'any',
      comparator: '>=',
      randomValue,
    },
    {
      reputation: 'any',
      comparator: '<',
      randomValue,
    },
  ];
}

const snapshotHasResults = snapshot => snapshot?.empty === false;

/**
 * Evaluate a snapshot and continue the plan when empty.
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }>, index: number, snapshot: { empty?: boolean } }} input Query evaluation context.
 * @returns {Promise<unknown>|unknown} Snapshot containing results or the promise for the next step.
 */
function selectSnapshotFromStep({ plan, runQuery, index, snapshot }) {
  if (snapshotHasResults(snapshot)) {
    return snapshot;
  }

  return resolvePlanStep({
    plan,
    runQuery,
    index: index + 1,
    lastSnapshot: snapshot,
  });
}

/**
 * Resolve the query plan sequentially until a snapshot yields results.
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }>, index: number, lastSnapshot: unknown }} input Remaining plan execution state.
 * @returns {Promise<unknown>} Snapshot matching the selection criteria or the last evaluated snapshot.
 */
async function resolvePlanStep({ plan, runQuery, index, lastSnapshot }) {
  if (index >= plan.length) {
    return lastSnapshot;
  }

  const snapshot = await runQuery(plan[index]);
  return selectSnapshotFromStep({ plan, runQuery, index, snapshot });
}

/**
 * Create a Firestore-agnostic variant snapshot fetcher.
 * @param {{ runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }> }} deps
 * Adapter that executes a single query descriptor.
 * @returns {(randomValue: number) => Promise<unknown>} Function resolving with the first snapshot containing results.
 */
export function createVariantSnapshotFetcher({ runQuery }) {
  return async function getVariantSnapshot(randomValue) {
    const plan = buildVariantQueryPlan(randomValue);
    return resolvePlanStep({
      plan,
      runQuery,
      index: 0,
      lastSnapshot: undefined,
    });
  };
}
