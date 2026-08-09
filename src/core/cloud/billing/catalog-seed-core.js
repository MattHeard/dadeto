import { createPricingSnapshot, quoteCreditPackage } from './pricing-core.js';

/**
 * Validate the document identity and normalized shape of a pricing snapshot.
 * @param {string} documentId Firestore document id.
 * @param {Record<string, unknown>} input Snapshot data.
 * @returns {Record<string, unknown>} Normalized snapshot data.
 */
export function normalizeCatalogSnapshot(documentId, input) {
  if (input.snapshotId !== documentId) {
    throw new TypeError('Pricing snapshot document ID must match snapshotId');
  }
  const operations = Array.isArray(input.operations)
    ? input.operations
    : Object.entries(input.operations ?? {}).map(([id, value]) => ({
        id,
        ...value,
      }));
  return createPricingSnapshot({ ...input, operations });
}

/**
 * Create an idempotent billing catalog seed operation.
 * @param {{ getPackage: (id: string) => Promise<Record<string, unknown>|null>, setPackage: (id: string, value: Record<string, unknown>) => Promise<void>, getSnapshot: (id: string) => Promise<Record<string, unknown>|null>, createSnapshot: (id: string, value: Record<string, unknown>) => Promise<void> }} store Catalog persistence boundary.
 * @param {{ packages: Record<string, Record<string, unknown>>, snapshots: Record<string, Record<string, unknown>> }} catalog Seed data.
 * @returns {Promise<{ packagesCreated: number, packagesUpdated: number, snapshotsCreated: number, snapshotsUnchanged: number }>}
 */
export async function seedBillingCatalog(store, catalog) {
  const result = {
    packagesCreated: 0,
    packagesUpdated: 0,
    snapshotsCreated: 0,
    snapshotsUnchanged: 0,
  };
  for (const [packageId, packageData] of Object.entries(catalog.packages)) {
    if (
      packageData.active !== true &&
      packageData.active !== false
    ) throw new TypeError('Package active must be boolean');
    if (!Number.isSafeInteger(packageData.amountUsdMinor) || packageData.amountUsdMinor <= 0)
      throw new TypeError('Package amountUsdMinor must be positive');
    const existing = await store.getPackage(packageId);
    if (!existing) result.packagesCreated += 1;
    else if (JSON.stringify(existing) !== JSON.stringify(packageData)) result.packagesUpdated += 1;
    await store.setPackage(packageId, packageData);
  }
  for (const [snapshotId, snapshotData] of Object.entries(catalog.snapshots)) {
    const normalized = normalizeCatalogSnapshot(snapshotId, snapshotData);
    const existing = await store.getSnapshot(snapshotId);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(normalized))
        throw new Error(`Pricing snapshot already exists with different data: ${snapshotId}`);
      result.snapshotsUnchanged += 1;
      continue;
    }
    await store.createSnapshot(snapshotId, normalized);
    result.snapshotsCreated += 1;
  }
  return result;
}

export function quoteSeededPackage(packageId, packageData, snapshot) {
  return quoteCreditPackage({ id: packageId, amountUsdMinor: packageData.amountUsdMinor }, snapshot);
}
