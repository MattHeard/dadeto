import { travelSegmentProposal } from './travelSegmentProposal.js';
// Toy: Pickup Return Segment Proposal

/**
 * Propose a return pickup segment.
 * @param {string} input JSON with possessionEndPoint, destination, travelDurationSeconds, endPointId, segmentId.
 * @returns {string} Proposed point and segment.
 */
export function pickupReturnSegmentProposal(input) {
  return travelSegmentProposal(input, 'pickup');
}
