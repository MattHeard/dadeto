import { existingAssetFulfillmentSequenceFeasibility } from './existingAssetFulfillmentSequenceFeasibility.js';
import { fulfillmentSkuAssetBoundary } from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a SKU against a complete fulfillment sequence.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFulfillmentFeasibility(input) {
  return fulfillmentSkuAssetBoundary(
    input,
    existingAssetFulfillmentSequenceFeasibility
  );
}
