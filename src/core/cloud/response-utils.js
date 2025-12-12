/**
 * Execute an async action and surface failures through the provided handler.
 * @param {() => Promise<T>} action Async callback that may reject.
 * @param {(error: unknown) => void} onFailure Handler invoked when `action` throws.
 * @returns {Promise<T | undefined>} Result of `action` or `undefined` when it fails.
 * @template T
 */
export async function runWithFailure(action, onFailure) {
  try {
    const value = await action();
    return { ok: true, value };
  } catch (error) {
    onFailure(error);
    return { ok: false };
  }
}
