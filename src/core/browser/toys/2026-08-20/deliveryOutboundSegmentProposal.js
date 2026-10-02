import { travelSegmentProposal } from './travelSegmentProposal.js';
// Toy: Delivery Outbound Segment Proposal

/**
 * Propose an outbound delivery segment.
 * @param {string} input JSON with possessionStartPoint, origin, travelDurationSeconds, startPointId, segmentId.
 * @returns {string} Proposed point and segment.
 */
export function deliveryOutboundSegmentProposal(input) {
  return travelSegmentProposal(input, 'delivery');
}
