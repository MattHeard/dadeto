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

/**
 * Keep the external HTTP signature pure of capabilities, minting per request.
 * @param {(allowEffects: import('../../types/allow-effects').AllowEffects, req: any, res: any) => Promise<void>} handler Explicit internal command handler.
 * @returns {(req: any, res: any) => Promise<void>} Public HTTP boundary.
 */
export function createEffectHttpBoundary(handler) {
  return async function effectHttpBoundary(req, res) {
    await handler(createAllowEffects(), req, res);
  };
}

/**
 * Adapt an effectful HTTP endpoint to a direct invocation boundary such as a scheduled or Firestore trigger.
 * @param {(permission: import('../../types/allow-effects').AllowEffects, ...args: any[]) => Promise<any>} handler Internal effectful handler.
 * @returns {(...args: any[]) => Promise<any>} Public runtime handler.
 */
export function createEffectInvocationBoundary(handler) {
  return async (...args) => handler(createAllowEffects(), ...args);
}
