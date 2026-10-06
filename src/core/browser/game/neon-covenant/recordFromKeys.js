/**
 * Create a record with one independently produced value for each key.
 * @template T
 * @param {string[]} keys Record keys.
 * @param {(key: string) => T} createValue Value factory.
 * @returns {Record<string, T>} Record populated from the keys.
 */
export function recordFromKeys(keys, createValue) {
  return Object.fromEntries(keys.map(key => [key, createValue(key)]));
}
