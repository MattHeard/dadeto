import { existingAssetFulfillmentFeasibility } from './existingAssetFulfillmentFeasibility.js';
import { existingAssetFulfillmentSequenceFeasibility } from './existingAssetFulfillmentSequenceFeasibility.js';
import { fulfillmentSkuAssetBoundary } from '../2026-08-22/fulfillmentResult.js';

/**
 * Bind a stock evaluator to the shared deterministic SKU selection boundary.
 * @param {(input: string) => string} evaluate Asset evaluation strategy.
 * @returns {(input: string) => string} JSON toy entry point.
 */
function createStockToy(evaluate) {
  return input => fulfillmentSkuAssetBoundary(input, evaluate);
}

/** Existing-stock feasibility using the single-operation asset evaluator. */
export const skuExistingStockFeasibility = createStockToy(
  existingAssetFulfillmentFeasibility
);

/** Existing-stock feasibility against the complete fulfillment sequence. */
export const skuExistingStockFulfillmentFeasibility = createStockToy(
  existingAssetFulfillmentSequenceFeasibility
);
