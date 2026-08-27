import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { contained } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON predicate result.
 */
export function segmentContainedWithinWindowPredicate(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    JSON.stringify({
      feasible: contained(
        request.segmentStartTimestamp,
        request.segmentEndTimestamp,
        request.windowStartTimestamp,
        request.windowEndTimestamp
      ),
    })
  );
}
