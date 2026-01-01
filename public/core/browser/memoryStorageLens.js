import { createStorageLens } from './storageLens.js';

/**
 * @module memoryStorageLens
 * @description In-memory storage lens implementation.
 * Data is stored in memory and lost when the page is refreshed.
 */

/**
 * Creates a memory storage lens backed by a Map.
 * @param {Map<string, unknown>} [store] - Optional Map to use as storage backend.
 * @returns {import('./storageLens.js').StorageLens} A lens for in-memory storage.
 */
export function createMemoryStorageLens(store = new Map()) {
  return createStorageLens(
    key => store.get(key),
    (key, value) => store.set(key, value)
  );
}
