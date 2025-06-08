export function parseJSONResult(result) {
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}
