const EFFECT_PERMISSION = Symbol('AllowEffects');

/**
 * Mint a fresh opaque command capability at an external runtime boundary.
 * @returns {import('../../types/allow-effects').AllowEffects} Explicit effect permission.
 */
export function createAllowEffects() {
  return /** @type {import('../../types/allow-effects').AllowEffects} */ (
    /** @type {unknown} */ (Object.freeze({ [EFFECT_PERMISSION]: true }))
  );
}
