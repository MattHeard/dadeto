import { existingAssetFulfillmentSequenceFeasibility } from './existingAssetFulfillmentSequenceFeasibility.js';
import {
  fulfillmentBoundary,
  fulfillmentNonblank,
} from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a SKU against a complete fulfillment sequence.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFulfillmentFeasibility(input) {
  return fulfillmentBoundary(input, 'feasible', request => {
    if (
      !fulfillmentNonblank(request?.requestedSku) ||
      !Array.isArray(request.assets)
    )
      throw new Error('A requested SKU and asset list are required.');
    const candidates = request.assets
      .filter(
        asset =>
          asset?.sku === request.requestedSku &&
          fulfillmentNonblank(asset.assetId)
      )
      .sort((left, right) =>
        String(left.assetId).localeCompare(String(right.assetId))
      );
    for (const asset of candidates) {
      const result = JSON.parse(
        existingAssetFulfillmentSequenceFeasibility(
          JSON.stringify({
            asset,
            proposal: request.proposal,
            points: request.points,
            spacePoints: request.spacePoints,
          })
        )
      );
      if (result.feasible === true) return JSON.stringify({ feasible: true });
    }
    return JSON.stringify({ feasible: false });
  });
}
