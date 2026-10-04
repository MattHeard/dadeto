const PERMISSION = Symbol('LocalAllowEffects');

/**
 * Bind an explicitly effectful simulator command at its external entry point.
 * @param {(permission: import('../../types/allow-effects').AllowEffects, request: any) => Promise<any>} responder Internal command.
 * @returns {(request: any) => Promise<any>} Public local route.
 */
export function bindEffectResponder(responder) {
  return async request => {
    const permission = /** @type {import('../../types/allow-effects').AllowEffects} */ (
      /** @type {unknown} */ (Object.freeze({ [PERMISSION]: true }))
    );
    return responder(permission, request);
  };
}
