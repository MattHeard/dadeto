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

function parseRequest(input) {
  const request = JSON.parse(input || '{}');
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('Input must be a JSON object.');
  }
  const memoryLocation = String(request.memoryLocation || 'temporary');
  const path = String(request.path || '').trim();
  if (!LOCATIONS.includes(memoryLocation)) throw new Error('Unsupported memory location.');
  if (!path) throw new Error('A path is required.');
  if (!request.object || typeof request.object !== 'object' || Array.isArray(request.object)) {
    throw new Error('An object property containing a JSON object is required.');
  }
  return { memoryLocation, path, object: request.object };
}

function readRoot(memoryLocation, env) {
  if (memoryLocation === 'permanent') {
    return deepClone(requireEnvHelper(env, 'getLocalPermanentData')() || {});
  }
  const envelope = deepClone(requireEnvHelper(env, 'getData')() || {});
  return memoryLocation === 'envelope' ? envelope : (envelope.temporary ||= {});
}

function readList(root, path) {
  const parts = path.split('.');
  let cursor = root;
  parts.forEach(part => {
    if (cursor[part] === undefined) cursor[part] = [];
    if (!Array.isArray(cursor[part])) throw new Error(`Path is not a list: ${path}`);
    cursor = cursor[part];
  });
  return cursor;
}

function writeRoot(memoryLocation, root, env) {
  if (memoryLocation === 'permanent') {
    requireEnvHelper(env, 'setLocalPermanentData')(root);
    return;
  }
  if (memoryLocation === 'envelope') {
    requireEnvHelper(env, 'setLocalTemporaryData')(root);
    return;
  }
  const envelope = deepClone(requireEnvHelper(env, 'getData')() || {});
  envelope.temporary = root;
  requireEnvHelper(env, 'setLocalTemporaryData')(envelope);
}
