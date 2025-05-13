// Toy: Base64 Encoder
// (string input, env) -> string (Base64 encoded)

export function encodeBase64(input, env) {
  const encodeBase64 = env.get("encodeBase64");
  return encodeBase64(input);
}
