// Toy: UUID from environment
// (input, env) -> string
/**
 * Returns a UUID string using the provided environment accessor.
 * @param {*} input - Unused input value.
 * @param {Map<string, Function>} env - Environment with a `getUuid` method.
 * @returns {string} Generated UUID.
 */
export function uuidToy(input, env) {
  const getUuid = env.get('getUuid');
  return getUuid();
}
