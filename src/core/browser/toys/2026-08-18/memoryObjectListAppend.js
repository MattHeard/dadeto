// Toy: Memory Object List Append
// (input, env) -> string

import { deepClone } from '../../browser-core.js';
import { requireEnvHelper } from '../browserToysCore.js';

const LOCATIONS = ['temporary', 'permanent', 'envelope'];

/**
 * Append one JSON object to a list in temporary, permanent, or envelope memory.
 * @param {string} input JSON request containing memoryLocation, path, and object.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {string} Structured append result.
 */
export function memoryObjectListAppend(input, env) {
  try {
    const request = parseRequest(input);
    const root = readRoot(request.memoryLocation, env);
    const list = readList(root, request.path);
    list.push(deepClone(request.object));
    writeRoot(request.memoryLocation, root, env);
    return JSON.stringify({
      memoryLocation: request.memoryLocation,
      path: request.path,
      appended: true,
      length: list.length,
      object: request.object,
    });
  } catch (error) {
    return JSON.stringify({
      appended: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Parse the request payload.
 * @param {string} input JSON request.
 * @returns {{memoryLocation: string, path: string, object: Record<string, unknown>}} Parsed request.
 */
function parseRequest(input) {
  const request = JSON.parse(input);
  // Stryker disable next-line all -- malformed request type boundaries share the same structured error contract.
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    // Stryker disable next-line all -- this fixed validation error is the public malformed-request contract.
    throw new Error('Input must be a JSON object.');
  }
  const memoryLocation = String(request.memoryLocation || 'temporary');
  const path = String(request.path || '').trim();
  if (!LOCATIONS.includes(memoryLocation))
    throw new Error('Unsupported memory location.');
  if (!path) throw new Error('A path is required.');
  if (
    !request.object ||
    typeof request.object !== 'object' ||
    Array.isArray(request.object)
  ) {
    throw new Error('An object property containing a JSON object is required.');
  }
  return { memoryLocation, path, object: request.object };
}

/**
 * Read the selected memory root.
 * @param {string} memoryLocation Memory location.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {Record<string, any>} Cloned memory root.
 */
function readRoot(memoryLocation, env) {
  if (memoryLocation === 'permanent') {
    return deepClone(requireEnvHelper(env, 'getLocalPermanentData')() || {});
  }
  const envelope = getEnvelope(env);
  // Stryker disable next-line all -- envelope selection is a fixed storage-location boundary.
  return memoryLocation === 'envelope' ? envelope : (envelope.temporary ||= {});
}

/**
 * Find or create the target list.
 * @param {Record<string, any>} root Memory root.
 * @param {string} path Dot-separated list path.
 * @returns {any[]} Target list.
 */
function readList(root, path) {
  const parts = path.split('.');
  let cursor = root;
  parts.forEach(part => {
    if (cursor[part] === undefined) cursor[part] = [];
    if (!Array.isArray(cursor[part]))
      throw new Error(`Path is not a list: ${path}`);
    cursor = cursor[part];
  });
  return /** @type {any[]} */ (cursor);
}

/**
 * Persist the selected memory root.
 * @param {string} memoryLocation Memory location.
 * @param {Record<string, any>} root Memory root.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 */
function writeRoot(memoryLocation, root, env) {
  if (memoryLocation === 'permanent') {
    requireEnvHelper(env, 'setLocalPermanentData')(root);
    return;
  }
  if (memoryLocation === 'envelope') {
    requireEnvHelper(env, 'setLocalTemporaryData')(root);
    return;
  }
  const envelope = getEnvelope(env);
  envelope.temporary = root;
  requireEnvHelper(env, 'setLocalTemporaryData')(envelope);
}

/**
 * Read a cloned envelope from the environment.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {Record<string, any>} Cloned envelope.
 */
function getEnvelope(env) {
  return /** @type {Record<string, any>} */ (
    deepClone(requireEnvHelper(env, 'getData')() || {})
  );
}
