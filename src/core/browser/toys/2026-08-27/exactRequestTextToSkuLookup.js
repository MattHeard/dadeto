import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { exactLookup } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON lookup result.
 */
export function exactRequestTextToSkuLookup(input) {
  return fulfillmentBoundary(input, 'matched', request =>
    JSON.stringify(exactLookup(request))
  );
}
