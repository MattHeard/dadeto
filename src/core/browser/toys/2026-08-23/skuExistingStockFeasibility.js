import { existingAssetFulfillmentFeasibility } from './existingAssetFulfillmentFeasibility.js';
import {
  fulfillmentAssetRequest,
  fulfillmentSkuBoundary,
} from '../2026-08-22/fulfillmentResult.js';

/**
 * Test existing assets for a requested SKU in deterministic asset-ID order.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuExistingStockFeasibility(input) {
  return fulfillmentSkuBoundary(input, (asset, request) =>
    existingAssetFulfillmentFeasibility(fulfillmentAssetRequest(asset, request))
  );
}
