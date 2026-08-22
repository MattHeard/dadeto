/**
 * Combine the independent procurement and existing-stock feasibility branches.
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function skuFulfillmentFeasibility(input) {
  try {
    const request = JSON.parse(input);
    return JSON.stringify({
      feasible:
        request?.procurementFeasible === true ||
        request?.existingStockFeasible === true,
    });
  } catch {
    return JSON.stringify({ feasible: false });
  }
}
