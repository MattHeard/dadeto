// @ts-nocheck -- seed persistence is an injected Firestore boundary.
/* eslint-disable jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
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
  return createPricingSnapshot({ ...input, operations });
}

/**
 *
 * @param operations
 */
function normalizeOperations(operations) {
  if (Array.isArray(operations)) return operations;
  return Object.entries(operations ?? {}).map(([id, value]) => ({
    id,
    ...value,
  }));
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
 *
 * @param store
 * @param id
 * @param data
 * @param result
 */
async function seedPackage(store, id, data, result) {
  if (typeof data.active !== 'boolean')
    throw new TypeError('Package active must be boolean');
  if (!Number.isSafeInteger(data.amountUsdMinor) || data.amountUsdMinor <= 0)
    throw new TypeError('Package amountUsdMinor must be positive');
  const existing = await store.getPackage(id);
  if (!existing) result.packagesCreated += 1;
  else if (JSON.stringify(existing) !== JSON.stringify(data))
    result.packagesUpdated += 1;
  await store.setPackage(id, data);
}

/**
 *
 * @param store
 * @param id
 * @param data
 * @param result
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
