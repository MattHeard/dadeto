export function httpRequest(input, env) {
  const result = {
    request: {
      url: input
    }
  };
  return JSON.stringify(result, null, 2);
}
