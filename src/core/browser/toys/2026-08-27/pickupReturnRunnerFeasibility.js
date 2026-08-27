import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { pickup } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function pickupReturnRunnerFeasibility(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    JSON.stringify(pickup(request))
  );
}
