// Toy: UUID from environment
// (input, env) -> string
/**
 *
 * @param input
 * @param env
 */
export function uuidToy(input, env) {
  const getUuid = env.get('getUuid');
  return getUuid();
}
