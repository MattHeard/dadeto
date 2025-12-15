/**
 * Build a JSON string describing a simple HTTP request.
 * @param {string} input - URL to request.
 * @returns {string} JSON string of the request structure.
 */
export function httpRequest(input) {
  const result = {
    request: {
      url: input,
    },
  };
  return JSON.stringify(result, null, 2);
}
