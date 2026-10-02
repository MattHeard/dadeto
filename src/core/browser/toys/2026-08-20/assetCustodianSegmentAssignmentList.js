// Toy: Asset Custodian Segment Assignment List
// (input, env) -> string

import { appendReferenceList } from '../2026-08-18/memoryObjectListAppend.js';
import {
  parseReferenceAssignment,
  referenceMemoryLocation,
} from './assignmentRequests.js';

/**
 * Append an asset, segment, and custodian reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function assetCustodianSegmentAssignmentList(input, env) {
  return appendReferenceList(input, env, parseRequest);
}

/**
 * Parse and validate an assignment request.
 * @param {string} input JSON request.
 * @returns {{memoryLocation: string, path: string, assignment: {assetId: string, segmentId: string, custodianPersonId: string}}} Parsed request.
 */
function parseRequest(input) {
  const { request, path, assignment } = parseReferenceAssignment(
    input,
    ['assetId', 'segmentId', 'custodianPersonId'],
    'An assignment requires assetId, segmentId, and custodianPersonId.'
  );
  return { memoryLocation: referenceMemoryLocation(request), path, assignment };
}

export { parseRequest };
