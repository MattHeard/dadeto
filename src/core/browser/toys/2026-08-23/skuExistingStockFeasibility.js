import { existingAssetFulfillmentFeasibility } from './existingAssetFulfillmentFeasibility.js';
import {
  fulfillmentBoundary,
  fulfillmentFindMatchingAsset,
} from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a requested SKU in deterministic asset-ID order.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFeasibility(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    fulfillmentFindMatchingAsset(request, asset =>
      existingAssetFulfillmentFeasibility(
        JSON.stringify({
          asset,
          proposal: request.proposal,
          points: request.points,
          spacePoints: request.spacePoints,
        })
      )
    )
  );
}
