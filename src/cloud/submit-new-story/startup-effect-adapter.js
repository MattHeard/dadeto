import { createEffectInvocationBoundary } from '../allow-effects.js';

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {() => void} ensureFirebaseApp */
export function ensureSubmitNewStoryFirebase(allowEffects, ensureFirebaseApp) {
  void allowEffects;
  ensureFirebaseApp();
}

/** @param {(allowEffects: import('../../../types/allow-effects').AllowEffects, args: { error: unknown, req: object, res: any, next: (error?: unknown) => void }) => void} handler */
export function bindSubmitNewStoryCorsErrorBoundary(handler) {
  return (error, req, res, next) =>
    createEffectInvocationBoundary((permission, args) =>
      handler(permission, args)
    )({ error, req, res, next });
}
