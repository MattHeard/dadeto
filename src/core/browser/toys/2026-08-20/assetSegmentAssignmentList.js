// Toy: Asset Segment Assignment List
// (input, env) -> string

import { appendReferenceList } from '../2026-08-18/memoryObjectListAppend.js';
import { parseReferenceAssignment } from './assignmentRequests.js';

/**
 * Append an asset-to-segment reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function assetSegmentAssignmentList(input, env) {
  return appendReferenceList(input, env, parseRequest);
}

/**
 * @param {string} input JSON request.
 * @returns {{memoryLocation?: string, path: string, assignment: {assetId: string, segmentId: string}}} Parsed request.
 */
function parseRequest(input) {
  const { request, path, assignment } = parseReferenceAssignment(
    input,
    ['assetId', 'segmentId'],
    'An assignment requires assetId and segmentId.'
  );
  return { memoryLocation: request.memoryLocation, path, assignment };
}

export { parseRequest };
