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

/**
 * Execute a protected action and invoke the success callback when it succeeds.
 * @param {() => Promise<T>} action Async callback that may reject.
 * @param {(error: unknown) => void} onFailure Handler invoked when `action` throws.
 * @param {(value: T) => void} onSuccess Handler invoked with the action result when it succeeds.
 * @returns {Promise<boolean>} True when the action completed without failure.
 * @template T
 */
export async function runWithFailureAndThen(action, onFailure, onSuccess) {
  const result = await runWithFailure(action, onFailure);
  if (!result.ok) {
    return false;
  }

  onSuccess(result.value);
  return true;
}
