// Toy: Person Segment Assignment List
// (input, env) -> string

import { appendReferenceList } from '../2026-08-18/memoryObjectListAppend.js';
import {
  parseReferenceAssignment,
  referenceMemoryLocation,
} from './assignmentRequests.js';

/**
 * Append a person-to-segment reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function personSegmentAssignmentList(input, env) {
  return appendReferenceList(input, env, parseRequest);
}

/**
 * Parse the request.
 * @param {string} input JSON request.
 * @returns {{memoryLocation: string, path: string, assignment: {personId: string, segmentId: string}}} Parsed request.
 */
function parseRequest(input) {
  const { request, path, assignment } = parseReferenceAssignment(
    input,
    ['personId', 'segmentId'],
    'An assignment requires personId and segmentId.'
  );
  return { memoryLocation: referenceMemoryLocation(request), path, assignment };
}

export { parseRequest };
