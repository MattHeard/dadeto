const PERMISSION = Symbol('LocalAllowEffects');

/**
 * Bind one local command to a freshly minted permission.
 * @param {(permission: import('../../types/allow-effects').AllowEffects) => Promise<any>} handler Effectful command.
 * @returns {Promise<any>} Command result.
 */
export async function bindEffectBoundary(handler) {
  const permission = /** @type {import('../../types/allow-effects').AllowEffects} */ (
    /** @type {unknown} */ (Object.freeze({ [PERMISSION]: true }))
  );
  return handler(permission);
}

/**
 * Bind an explicitly effectful simulator command at its external entry point.
 * @param {(permission: import('../../types/allow-effects').AllowEffects, request: any) => Promise<any>} responder Internal command.
 * @returns {(request: any) => Promise<any>} Public local route.
 */
export function bindEffectResponder(responder) {
  return async request => {
    return bindEffectBoundary(permission => responder(permission, request));
  };
}
