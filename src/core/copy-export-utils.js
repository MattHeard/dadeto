/**
 * Build an exports object from explicit name/value tuples.
 * @param {Array<[string, unknown]>} entries - Name/value pairs to expose.
 * @returns {Record<string, unknown>} Combined helpers ready for export.
 */
export function buildCopyExportMap(entries) {
  return Object.fromEntries(entries);
}
