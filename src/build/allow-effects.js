const PERMISSION = Symbol('BuildAllowEffects');

/**
 * Bind one build command to a fresh permission for its side effect.
 * @template TValue
 * @param {(permission: import('../../types/allow-effects').AllowEffects) => Promise<TValue>} handler Effectful build command.
 * @returns {Promise<TValue>} Command result.
 */
export async function bindEffectBoundary(handler) {
  const permission = /** @type {import('../../types/allow-effects').AllowEffects} */ (
    /** @type {unknown} */ (Object.freeze({ [PERMISSION]: true }))
  );
  return handler(permission);
}
