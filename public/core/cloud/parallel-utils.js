/**
 * Execute the iterator for every element in parallel.
 * @param {T[]} items Items to iterate.
 * @param {(item: T) => Promise<unknown>} iterator Async iterator invoked per item.
 * @returns {Promise<unknown[]>} Promise that resolves once every iterator call finishes.
 * @template T
 */
export function runInParallel(items, iterator) {
  if (!items.length) {
    return Promise.resolve([]);
  }

  return Promise.all(items.map(iterator));
}
