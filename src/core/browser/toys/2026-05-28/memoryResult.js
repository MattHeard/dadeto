/**
 * Build a memory operation result with its normalized location and path.
 * @template {Record<string, unknown>} Fields
 * @param {{ memoryLocation: string, path: string }} request Normalized request.
 * @param {Fields} fields Operation-specific result fields.
 * @param {string} [memoryLocation] Optional location override for error results.
 * @returns {{ memoryLocation: string, path: string } & Fields} Complete memory result.
 */
export function createMemoryResult(
  request,
  fields,
  memoryLocation = request.memoryLocation
) {
  return {
    memoryLocation,
    path: request.path,
    ...fields,
  };
}
