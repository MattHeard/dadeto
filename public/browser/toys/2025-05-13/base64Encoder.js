// Toy: Base64 Encoder
// (string input, env) -> string (Base64 encoded)

/**
 * Encodes a string to Base64 using the environment helper.
 * @param {string} input - String to encode.
 * @param {Map<string, Function>} env - Environment map with `encodeBase64`.
 * @returns {string} The Base64 encoded string.
 */
export function encodeBase64(input, env) {
  const encodeBase64 = env.get('encodeBase64');
  return encodeBase64(input);
}
