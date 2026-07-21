/**
 * Regenerate only variants whose embedded target weights are stale.
 * @param {{db: any, renderVariant: (snap: any) => Promise<unknown>, consoleError?: Function}} options Dependencies.
 * @returns {Promise<{processed: number, failed: number}>} Processing totals.
 */
export async function regenerateDirtyTreeWeightVariants({
  db,
  renderVariant,
  consoleError = () => {},
}) {
  const snapshot = await db
    .collectionGroup('variants')
    .where('targetTreeWeightsDirty', '==', true)
    .get();
  let processed = 0;
  let failed = 0;
  for (const variant of snapshot.docs ?? []) {
    try {
      await renderVariant(variant);
      processed += 1;
    } catch (error) {
      failed += 1;
      consoleError('tree-weight regeneration failed', variant.ref?.path, error);
    }
  }
  return { processed, failed };
}

/**
 * Calculate and persist variant sums from a bottom-up tree walker.
 * @param {{stories: any[], readChildren: Function, writeVariant: Function}} options Migration dependencies.
 * @returns {Promise<number>} Number of variants written.
 */
export async function migrateTreeVisibilitySums({
  stories,
  readChildren,
  writeVariant,
}) {
  let written = 0;
  /**
   * @param {{data?: {visibility?: number}}} variant Variant node.
   * @returns {Promise<number>} Computed subtree sum.
   */
  async function visitVariant(variant) {
    const children = await readChildren(variant);
    const descendantSums = [];
    for (const child of children) {
      descendantSums.push(await visitVariant(child));
    }
    const sum =
      /** @type {number} */ (variant.data?.visibility ?? 1) +
      descendantSums.reduce((total, childSum) => total + childSum, 0);
    const update = /** @type {Record<string, unknown>} */ ({
      treeVisibilitySum: sum,
    });
    if (children.length) update.targetTreeWeightsDirty = true;
    await writeVariant(variant, update);
    written += 1;
    return sum;
  }
  for (const story of stories) {
    for (const variant of await readChildren(story)) {
      await visitVariant(variant);
    }
  }
  return written;
}
// @ts-check
