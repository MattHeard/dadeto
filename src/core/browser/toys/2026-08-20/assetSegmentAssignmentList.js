// Toy: Asset Segment Assignment List
// (input, env) -> string

import { memoryObjectListAppend } from '../2026-08-18/memoryObjectListAppend.js';

/**
 * Append an asset-to-segment reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function assetSegmentAssignmentList(input, env) {
  try {
    const request = parseRequest(input);
    return memoryObjectListAppend(
      JSON.stringify({
        memoryLocation: request.memoryLocation,
        path: request.path,
        object: request.assignment,
      }),
      env
    );
  } catch (error) {
    return JSON.stringify({
      appended: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * @param {string} input JSON request.
 * @returns {{memoryLocation?: string, path: string, assignment: {assetId: string, segmentId: string}}} Parsed request.
 */
// jscpd:ignore-start — request parsing intentionally mirrors MEMO4's JSON boundary.
function parseRequest(input) {
  const request = JSON.parse(input || '{}');
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('Input must be a JSON object.');
  }
  const source = request.assignment;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('An assignment object is required.');
  }
  const assetId = String(source.assetId || '').trim();
  const segmentId = String(source.segmentId || '').trim();
  if (!assetId || !segmentId) {
    throw new Error('An assignment requires assetId and segmentId.');
  }
  const path = String(request.path || '').trim();
  if (!path) throw new Error('A path is required.');
  return {
    memoryLocation: request.memoryLocation,
    path,
    assignment: { assetId, segmentId },
  };
}
// jscpd:ignore-end
