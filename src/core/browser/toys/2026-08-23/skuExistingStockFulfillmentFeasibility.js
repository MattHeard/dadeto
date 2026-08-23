import { existingAssetFulfillmentSequenceFeasibility } from './existingAssetFulfillmentSequenceFeasibility.js';
import { fulfillmentSkuBoundary } from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a SKU against a complete fulfillment sequence.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFulfillmentFeasibility(input) {
  return fulfillmentSkuBoundary(input, (asset, request) =>
    existingAssetFulfillmentSequenceFeasibility(
      JSON.stringify({
        asset,
        proposal: request.proposal,
        points: request.points,
        spacePoints: request.spacePoints,
      })
    )
  );
}
