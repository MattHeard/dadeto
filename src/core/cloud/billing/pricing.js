import {
  calculateOperationCredits as calculateOperationCreditsCore,
  calculatePackageCredits as calculatePackageCreditsCore,
  createPricingSnapshot as createPricingSnapshotCore,
  quoteCreditPackage as quoteCreditPackageCore,
  SCALE,
} from './pricing-core.js';

export { SCALE };
export const createPricingSnapshot = input => createPricingSnapshotCore(input);
export const calculatePackageCredits = (amount, snapshot) =>
  calculatePackageCreditsCore(amount, snapshot);
export const calculateOperationCredits = (operationId, snapshot) =>
  calculateOperationCreditsCore(operationId, snapshot);
export const quoteCreditPackage = (packageRate, snapshot) =>
  quoteCreditPackageCore(packageRate, snapshot);
