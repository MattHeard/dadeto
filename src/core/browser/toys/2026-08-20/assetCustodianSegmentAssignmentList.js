// Toy: Asset Custodian Segment Assignment List
// (input, env) -> string
// jscpd:ignore-start

import { deepClone } from '../../browser-core.js';
import { requireEnvHelper } from '../browserToysCore.js';

/**
 * Append an asset, segment, and custodian reference to a persisted list.
 * @param {string} input JSON payload with memoryLocation, path, and assignment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function assetCustodianSegmentAssignmentList(input, env) {
  try {
    const request = parseRequest(input);
    const root = readRoot(request.memoryLocation, env);
    const list = readList(root, request.path);
    list.push(deepClone(request.assignment));
    writeRoot(request.memoryLocation, root, env);
    return JSON.stringify({
      memoryLocation: request.memoryLocation,
      path: request.path,
      appended: true,
      length: list.length,
      object: request.assignment,
    });
  } catch (error) {
    return JSON.stringify({
      appended: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Parse and validate an assignment request.
 * @param {string} input JSON request.
 * @returns {{memoryLocation: string, path: string, assignment: {assetId: string, segmentId: string, custodianPersonId: string}}} Parsed request.
 */
function parseRequest(input) {
  const request = JSON.parse(input || '{}');
  const assignment = request?.assignment;
  if (!request || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Input must be a JSON object.');
  if (
    !assignment ||
    typeof assignment !== 'object' ||
    Array.isArray(assignment)
  )
    throw new Error('An assignment object is required.');
  const assetId = String(assignment.assetId || '').trim();
  const segmentId = String(assignment.segmentId || '').trim();
  const custodianPersonId = String(assignment.custodianPersonId || '').trim();
  const path = String(request.path || '').trim();
  const memoryLocation = String(request.memoryLocation || 'temporary');
  if (!assetId || !segmentId || !custodianPersonId)
    throw new Error(
      'An assignment requires assetId, segmentId, and custodianPersonId.'
    );
  if (!path) throw new Error('A path is required.');
  if (!['temporary', 'permanent', 'envelope'].includes(memoryLocation))
    throw new Error('Unsupported memory location.');
  return {
    memoryLocation,
    path,
    assignment: { assetId, segmentId, custodianPersonId },
  };
}

/**
 * @param {string} location Memory location.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {Record<string, any>} Memory root.
 */
function readRoot(location, env) {
  if (location === 'permanent')
    return deepClone(requireEnvHelper(env, 'getLocalPermanentData')() || {});
  const envelope = deepClone(requireEnvHelper(env, 'getData')() || {});
  return location === 'envelope' ? envelope : (envelope.temporary ||= {});
}

/**
 * @param {Record<string, any>} root Memory root.
 * @param {string} path List path.
 * @returns {any[]} Target list.
 */
function readList(root, path) {
  let cursor = root;
  path.split('.').forEach(part => {
    if (cursor[part] === undefined) cursor[part] = [];
    if (!Array.isArray(cursor[part]))
      throw new Error(`Path is not a list: ${path}`);
    cursor = cursor[part];
  });
  return cursor;
}

/**
 * @param {string} location Memory location.
 * @param {Record<string, any>} root Memory root.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {void} Nothing.
 */
function writeRoot(location, root, env) {
  if (location === 'permanent') {
    requireEnvHelper(env, 'setLocalPermanentData')(root);
    return;
  }
  if (location === 'envelope') {
    requireEnvHelper(env, 'setLocalTemporaryData')(root);
    return;
  }
  const envelope = deepClone(requireEnvHelper(env, 'getData')() || {});
  envelope.temporary = root;
  requireEnvHelper(env, 'setLocalTemporaryData')(envelope);
}
// jscpd:ignore-end
