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
