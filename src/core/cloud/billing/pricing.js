import {
  calculateOperationCredits as calculateOperationCreditsCore,
  calculatePackageCredits as calculatePackageCreditsCore,
  createPricingSnapshot as createPricingSnapshotCore,
  quoteCreditPackage as quoteCreditPackageCore,
  SCALE,
} from './pricing-core.js';

export { SCALE };
/**
 * @param {Parameters<typeof createPricingSnapshotCore>[0]} input Input data.
 * @returns {ReturnType<typeof createPricingSnapshotCore>} Snapshot.
 */
export const createPricingSnapshot = input => createPricingSnapshotCore(input);
/**
 * @param {Parameters<typeof calculatePackageCreditsCore>[0]} amount Amount.
 * @param {Parameters<typeof calculatePackageCreditsCore>[1]} snapshot Snapshot.
 * @returns {ReturnType<typeof calculatePackageCreditsCore>} Credits.
 */
export const calculatePackageCredits = (amount, snapshot) =>
  calculatePackageCreditsCore(amount, snapshot);
/**
 * @param {Parameters<typeof calculateOperationCreditsCore>[0]} operationId Operation id.
 * @param {Parameters<typeof calculateOperationCreditsCore>[1]} snapshot Snapshot.
 * @returns {ReturnType<typeof calculateOperationCreditsCore>} Credits.
 */
export const calculateOperationCredits = (operationId, snapshot) =>
  calculateOperationCreditsCore(operationId, snapshot);
/**
 * @param {Parameters<typeof quoteCreditPackageCore>[0]} packageRate Package rate.
 * @param {Parameters<typeof quoteCreditPackageCore>[1]} snapshot Snapshot.
 * @returns {ReturnType<typeof quoteCreditPackageCore>} Quote.
 */
export const quoteCreditPackage = (packageRate, snapshot) =>
  quoteCreditPackageCore(packageRate, snapshot);
