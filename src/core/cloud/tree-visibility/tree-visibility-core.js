// @ts-check

/** @typedef {{ visibility?: number, treeVisibilitySum?: number }} VisibilityData */

export const TREE_WEIGHT_DIRTY_THRESHOLD = 0.05;

/**
 * @param {VisibilityData} data Variant data.
 * @returns {number} Effective visibility.
 */
export function resolveVariantVisibility(data = {}) {
  return data.visibility ?? 1;
}

/**
 * @param {number | undefined} visibility Root visibility.
 * @param {number[]} descendantSums Descendant sums.
 * @returns {number} Aggregate sum.
 */
export function calculateTreeVisibilitySum(visibility, descendantSums = []) {
  return (
    resolveVariantVisibility({ visibility }) +
    descendantSums.reduce((sum, value) => sum + Number(value ?? 0), 0)
  );
}

/**
 * @param {number} previous Previous sum.
 * @param {number} current Current sum.
 * @returns {boolean} Whether the threshold was crossed.
 */
export function changedByTreeWeightThreshold(previous, current) {
  if (previous === current) return false;
  if (previous === 0) return true;
  return (
    Math.abs(current - previous) / Math.abs(previous) >=
    TREE_WEIGHT_DIRTY_THRESHOLD
  );
}

/**
 * @param {VisibilityData} previous Previous data.
 * @param {VisibilityData} current Current data.
 * @returns {number} Visibility delta.
 */
export function getVisibilityDelta(previous = {}, current = {}) {
  return resolveVariantVisibility(current) - resolveVariantVisibility(previous);
}

/**
 * @param {VisibilityData} data Variant data.
 * @param {number} delta Aggregate delta.
 * @returns {number} Updated aggregate.
 */
export function addTreeVisibilityDelta(data, delta) {
  return (data.treeVisibilitySum ?? resolveVariantVisibility(data)) + delta;
}

/**
 * @param {{variantRef: any, delta: number, getParentVariantRef: Function, updateVariant: Function, markParentDirty: Function}} options Propagation dependencies.
 * @returns {Promise<void>} Completion promise.
 */
export async function propagateTreeVisibilityDelta({
  variantRef,
  delta,
  getParentVariantRef,
  updateVariant,
  markParentDirty,
}) {
  let currentRef = variantRef;
  while (currentRef) {
    const snapshot = await currentRef.get();
    if (!snapshot?.exists) break;
    const data = snapshot.data() ?? {};
    const previousSum =
      data.treeVisibilitySum ?? resolveVariantVisibility(data);
    const currentSum = addTreeVisibilityDelta(data, delta);
    await updateVariant(currentRef, {
      treeVisibilitySum: currentSum,
    });
    if (changedByTreeWeightThreshold(previousSum, currentSum)) {
      await markParentDirty(currentRef);
    }
    currentRef = await getParentVariantRef(currentRef);
  }
}
