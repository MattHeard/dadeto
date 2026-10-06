const EFFECT_PERMISSION = Symbol('AllowEffects');

/**
 * Mint one browser command permission for the active boundary callback.
 * @param {(permission: import('../../types/allow-effects').AllowEffects) => Promise<void>} handler Effectful command callback.
 * @returns {Promise<void>} Completion of the command.
 */
export async function bindEffectBoundary(handler) {
  const permission = /** @type {import('../../types/allow-effects').AllowEffects} */ (
    /** @type {unknown} */ (Object.freeze({ [EFFECT_PERMISSION]: true }))
  );
  await handler(permission);
}

/**
 * Adapt native fetch to the permission-aware transport contract used by commands.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn Native fetch implementation.
 * @returns {(permission: import('../../types/allow-effects').AllowEffects, input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} Permission-aware fetch transport.
 */
export function createEffectFetchFn(fetchFn) {
  return (_permission, input, init) => fetchFn(input, init);
}
