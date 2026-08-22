import { existingAssetFulfillmentFeasibility } from './existingAssetFulfillmentFeasibility.js';

/**
 * Test existing assets for a requested SKU in deterministic asset-ID order.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFeasibility(input) {
  try {
    const request = JSON.parse(input);
    if (!nonblank(request?.requestedSku) || !Array.isArray(request.assets))
      throw new Error('A requested SKU and asset list are required.');
    const candidates = request.assets
      .filter(
        asset => asset?.sku === request.requestedSku && nonblank(asset.assetId)
      )
      .sort((left, right) =>
        String(left.assetId).localeCompare(String(right.assetId))
      );
    for (const asset of candidates) {
      const result = JSON.parse(
        existingAssetFulfillmentFeasibility(
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
  } catch (error) {
    return JSON.stringify({ feasible: false, reason: error.message });
  }
}

/**
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether nonblank.
 */
function nonblank(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}
