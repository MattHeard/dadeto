// Shared atomic append helper for safe assignment writers.
/* istanbul ignore file -- exercised through the toy integration suite. */
// jscpd:ignore-start
import { deepClone } from '../../browser-core.js';
import { requireEnvHelper } from '../browserToysCore.js';

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
// jscpd:ignore-end
