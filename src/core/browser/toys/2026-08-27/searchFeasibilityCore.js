import { fulfillmentBoundary } from '../2026-08-22/fulfillmentResult.js';
import {
  composed,
  procurement,
  pickup,
  delivery,
} from '../../../object-minute-rental-search/search-core.js';

export * from '../../../object-minute-rental-search/search-core.js';

/**
 * Adapt a feasibility evaluator to the shared JSON toy boundary.
 * @param {(request: Record<string, unknown>) => unknown} evaluate Feasibility evaluator.
 * @returns {(input: string) => string} JSON toy adapter.
 */
export function createFeasibilityToy(evaluate) {
  return input =>
    fulfillmentBoundary(input, 'feasible', request =>
      JSON.stringify(evaluate(request))
    );
}

/** JSON adapter for procurement-backed fulfillment. */
export const procurementBackedFulfillmentFeasibilityComposition =
  createFeasibilityToy(composed);
/** JSON adapter for procurement segment feasibility. */
export const procurementSegmentFeasibility = createFeasibilityToy(procurement);
/** JSON adapter for pickup and return runner feasibility. */
export const pickupReturnRunnerFeasibility = createFeasibilityToy(pickup);
/** JSON adapter for outbound delivery runner feasibility. */
export const deliveryOutboundRunnerFeasibility = createFeasibilityToy(delivery);
