// Toy: UUID from environment
// (input, env) -> string
export function uuidToy(input, env) {
  const getUuid = env.get("getUuid");
  return getUuid();
}
