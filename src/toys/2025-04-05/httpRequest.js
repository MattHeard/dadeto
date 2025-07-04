/**
 *
 * @param input
 */
export function httpRequest(input) {
  const result = {
    request: {
      url: input,
    },
  };
  return JSON.stringify(result, null, 2);
}
