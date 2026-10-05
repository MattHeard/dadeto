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
  const operations = normalizeOperations(input.operations);
  return createPricingSnapshot(
    /** @type {Parameters<typeof createPricingSnapshot>[0]} */ ({
      ...input,
      operations,
    })
  );
}

/**
 * Normalize operation definitions from either supported catalog shape.
 * @param {unknown} operations Operation definitions.
 * @returns {Array<{id: string, costEurMicros: number}>} Normalized operation rows.
 */
function normalizeOperations(operations) {
  return Object.entries(
    /** @type {Record<string, unknown>} */ (operations ?? {})
  ).map(([id, value]) => {
    if (!value || typeof value !== 'object')
      throw new TypeError('Pricing operation must be an object');
    const operation = /** @type {Record<string, unknown>} */ (value);
    if (typeof operation.costEurMicros !== 'number')
      throw new TypeError('Pricing operation costEurMicros must be a number');
    return { ...operation, id, costEurMicros: operation.costEurMicros };
  });
}

/**
 * Create an idempotent billing catalog seed operation.
 * @param {{ getPackage: (id: string) => Promise<Record<string, unknown>|null>, setPackage: (id: string, value: Record<string, unknown>) => Promise<void>, getSnapshot: (id: string) => Promise<Record<string, unknown>|null>, createSnapshot: (id: string, value: Record<string, unknown>) => Promise<void> }} store Catalog persistence boundary.
 * @param {{ packages: Record<string, Record<string, unknown>>, snapshots: Record<string, Record<string, unknown>> }} catalog Seed data.
 * @returns {Promise<{ packagesCreated: number, packagesUpdated: number, snapshotsCreated: number, snapshotsUnchanged: number }>} Seed counts.
 */
export async function seedBillingCatalog(store, catalog) {
  const result = {
    packagesCreated: 0,
    packagesUpdated: 0,
    snapshotsCreated: 0,
    snapshotsUnchanged: 0,
  };
  for (const [id, data] of Object.entries(catalog.packages))
    await seedPackage(store, id, data, result);
  for (const [id, data] of Object.entries(catalog.snapshots))
    await seedSnapshot(store, id, data, result);
  return result;
}

/**
 * Seed one package and update the result counters.
 * @param {{getPackage: (id: string) => Promise<Record<string, unknown>|null>, setPackage: (id: string, value: Record<string, unknown>) => Promise<void>}} store Catalog persistence boundary.
 * @param {string} id Package identifier.
 * @param {Record<string, unknown>} data Package data.
 * @param {Record<string, number>} result Mutable seed counters.
 * @returns {Promise<void>} Completion promise.
 */
async function seedPackage(store, id, data, result) {
  if (typeof data.active !== 'boolean')
    throw new TypeError('Package active must be boolean');
  if (
    typeof data.amountUsdMinor !== 'number' ||
    !Number.isSafeInteger(data.amountUsdMinor) ||
    data.amountUsdMinor <= 0
  )
    throw new TypeError('Package amountUsdMinor must be positive');
  const existing = await store.getPackage(id);
  if (!existing) result.packagesCreated += 1;
  else if (JSON.stringify(existing) !== JSON.stringify(data))
    result.packagesUpdated += 1;
  await store.setPackage(id, data);
}

/**
 * Seed one pricing snapshot and update the result counters.
 * @param {{getSnapshot: (id: string) => Promise<Record<string, unknown>|null>, createSnapshot: (id: string, value: Record<string, unknown>) => Promise<void>}} store Catalog persistence boundary.
 * @param {string} id Snapshot identifier.
 * @param {Record<string, unknown>} data Snapshot data.
 * @param {Record<string, number>} result Mutable seed counters.
 * @returns {Promise<void>} Completion promise.
 */
async function seedSnapshot(store, id, data, result) {
  const normalized = normalizeCatalogSnapshot(id, data);
  const existing = await store.getSnapshot(id);
  if (!existing) {
    await store.createSnapshot(id, normalized);
    result.snapshotsCreated += 1;
  } else if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
    throw new Error(
      `Pricing snapshot already exists with different data: ${id}`
    );
  } else result.snapshotsUnchanged += 1;
}

/**
 * Quote a seeded package using a validated snapshot.
 * @param {string} packageId Package identifier.
 * @param {{ amountUsdMinor: number }} packageData Package data.
 * @param {import('./pricing-core.js').PricingSnapshot} snapshot Pricing snapshot.
 * @returns {object} Package quote.
 */
export function quoteSeededPackage(packageId, packageData, snapshot) {
  return quoteCreditPackage(
    { id: packageId, amountUsdMinor: packageData.amountUsdMinor },
    snapshot
  );
}
