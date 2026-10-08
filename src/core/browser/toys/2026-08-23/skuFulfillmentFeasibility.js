/**
 * Combine the independent procurement and existing-stock feasibility branches.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuFulfillmentFeasibility(input) {
  try {
    const request = JSON.parse(input);
    return formatFulfillmentFeasibility(
      request.procurementFeasible === true ||
        request.existingStockFeasible === true
    );
  } catch {
    return formatFulfillmentFeasibility(false);
  }
}
import { formatFulfillmentFeasibility } from '../2026-08-22/fulfillmentResult.js';
