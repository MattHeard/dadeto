// Shared atomic append helper for safe assignment writers.
import { deepClone } from '../../browser-core.js';
import { requireEnvHelper } from '../browserToysCore.js';

/**
 * Append one assignment through the same atomic persistence boundary.
 * @param {{memoryLocation?: string, path?: string}} request Persistence options.
 * @param {Record<string, unknown>} object Assignment record.
 * @param {string} defaultPath Default collection path.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {number} Updated collection length.
 */
export function appendOneAssignment(request, object, defaultPath, env) {
  const commit = appendAtomically(
    request.memoryLocation || 'temporary',
    [{ path: request.path || defaultPath, object }],
    env
  );
  return commit.lengths[0];
}

/**
 * Append multiple records in one memory-root write.
 * @param {string} location Memory location.
 * @param {Array<{path: string, object: Record<string, unknown>}>} writes Lists and objects.
 * @param {import('../browserToysCore.js').ToyEnv} env Storage helpers.
 * @returns {{lengths: number[]}} Resulting list lengths.
 */
export function appendAtomically(location, writes, env) {
  if (!['temporary', 'permanent', 'envelope'].includes(location))
    throw new Error('Unsupported memory location.');
  /** @type {Record<string, any>} */
  const root =
    location === 'permanent'
      ? deepClone(requireEnvHelper(env, 'getLocalPermanentData')() || {})
      : deepClone(requireEnvHelper(env, 'getData')() || {});
  const target =
    location === 'temporary'
      ? /** @type {Record<string, any>} */ (root.temporary ||= {})
      : root;
  const lengths = writes.map(write => {
    let cursor = target;
    write.path.split('.').forEach(part => {
      if (cursor[part] === undefined) cursor[part] = [];
      if (!Array.isArray(cursor[part]))
        throw new Error(`Path is not a list: ${write.path}`);
      cursor = cursor[part];
    });
    cursor.push(deepClone(write.object));
    return cursor.length;
  });
  if (location === 'permanent')
    requireEnvHelper(env, 'setLocalPermanentData')(root);
  else requireEnvHelper(env, 'setLocalTemporaryData')(root);
  return { lengths };
}
