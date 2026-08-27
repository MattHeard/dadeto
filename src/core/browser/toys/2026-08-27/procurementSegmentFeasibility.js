import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { procurement } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON feasibility result.
 */
export function procurementSegmentFeasibility(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    JSON.stringify(procurement(request))
  );
}
