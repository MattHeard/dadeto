import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { composed } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function procurementBackedFulfillmentFeasibilityComposition(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    JSON.stringify(composed(request))
  );
}
