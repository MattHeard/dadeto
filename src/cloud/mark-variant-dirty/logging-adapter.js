/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** @param {AllowEffects} permission @param {string} message @param {object} [details] */
export function logWarning(permission, message, details) {
  void permission;
  Reflect.get(globalThis, 'console')?.warn?.(message, details);
}
