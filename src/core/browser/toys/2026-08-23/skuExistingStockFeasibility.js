import { existingAssetFulfillmentFeasibility } from './existingAssetFulfillmentFeasibility.js';
import { fulfillmentSkuAssetBoundary } from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a requested SKU in deterministic asset-ID order.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFeasibility(input) {
  return fulfillmentSkuAssetBoundary(
    input,
    existingAssetFulfillmentFeasibility
  );
}
