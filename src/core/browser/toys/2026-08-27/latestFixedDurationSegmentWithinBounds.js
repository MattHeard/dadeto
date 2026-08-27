import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import { latestPlacement } from './searchFeasibilityCore.js';

/**
 * @param {string} input JSON request.
 * @returns {string} JSON placement result.
 */
export function latestFixedDurationSegmentWithinBounds(input) {
  return fulfillmentBoundary(input, 'feasible', request =>
    JSON.stringify(
      latestPlacement(
        request.durationSeconds,
        request.earliestStartTimestamp,
        request.latestEndTimestamp
      )
    )
  );
}
