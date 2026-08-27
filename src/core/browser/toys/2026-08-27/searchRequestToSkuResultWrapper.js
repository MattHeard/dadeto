import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { composed, exactLookup } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON search result.
 */
export function searchRequestToSkuResultWrapper(input) {
  return fulfillmentBoundary(input, 'valid', request => {
    const lookup = exactLookup(request);
    if (!lookup.matched) return JSON.stringify({ valid: true, results: [] });
    const result = composed(request);
    return JSON.stringify({
      valid: true,
      results: result.feasible ? [{ skuId: lookup.skuId }] : [],
    });
  });
}
