// @ts-nocheck
// Toy: Person Segment Assignment List
// (input, env) -> string
// jscpd:ignore-start

import { memoryObjectListAppend } from '../2026-08-18/memoryObjectListAppend.js';

/**
 * Append a person-to-segment reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function personSegmentAssignmentList(input, env) {
  try {
    const request = parseRequest(input);
    return memoryObjectListAppend(JSON.stringify({ ...request, object: request.assignment }), env);
  } catch (error) {
    return JSON.stringify({
      appended: false,
      error: error.message,
    });
  }
}

/**
 * Parse the request.
 * @param {string} input JSON request.
 * @returns {{memoryLocation: string, path: string, assignment: {personId: string, segmentId: string}}} Parsed request.
 */
function parseRequest(input) {
  const request = JSON.parse(input);
  if (!request || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Input must be a JSON object.');
  const assignment = request.assignment;
  if (
    !assignment ||
    typeof assignment !== 'object' ||
    Array.isArray(assignment)
  )
    throw new Error('An assignment object is required.');
  const personId = String(assignment.personId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  const path = String(request.path || '').trim();
  const memoryLocation = String(request.memoryLocation || 'temporary');
  if (!personId || !segmentId)
    throw new Error('An assignment requires personId and segmentId.');
  if (!path) throw new Error('A path is required.');
  if (!['temporary', 'permanent', 'envelope'].includes(memoryLocation))
    throw new Error('Unsupported memory location.');
  return { memoryLocation, path, assignment: { personId, segmentId } };
}

// jscpd:ignore-end
