import { regenerateDirtyTreeWeightVariants } from './tree-visibility-regeneration-core.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a permission-aware tree-visibility regeneration runner.
 * @param {(permission: AllowEffects) => import('firebase-admin/firestore').Firestore} getFirestoreInstance Firestore accessor.
 * @param {(permission: AllowEffects, snapshot: unknown) => Promise<unknown>} render Renderer.
 * @param {(permission: AllowEffects, message: string, path?: string, error?: unknown) => void} logError Permission-aware error logger.
 * @returns {(permission: AllowEffects) => Promise<unknown>} Regeneration runner.
 */
export function createTreeVisibilityRegenerationRunner(
  getFirestoreInstance,
  render,
  logError
) {
  return permission =>
    regenerateDirtyTreeWeightVariants(permission, {
      db: /** @type {any} */ (getFirestoreInstance(permission)),
      renderVariant: render,
      logError,
    });
}

/**
 * Create the scheduled and HTTP regeneration handlers.
 * @param {import('../../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Invocation permission boundary.
 * @param {(permission: AllowEffects) => Promise<unknown>} run Regeneration runner.
 * @param {(permission: AllowEffects, response: import('express').Response, body: unknown) => unknown} sendResponse Permission-aware HTTP response writer.
 * @returns {{scheduled: () => Promise<null>, http: (request: import('express').Request, response: import('express').Response) => Promise<void>}} Runtime handlers.
 */
export function createTreeVisibilityRegenerationHandlers(
  bindEffectBoundary,
  run,
  sendResponse
) {
  const scheduled = () =>
    bindEffectBoundary(async (/** @type {AllowEffects} */ allowEffects) => {
      await run(allowEffects);
      return null;
    });
  /**
   * @param {import('express').Request} _request HTTP request.
   * @param {import('express').Response} response HTTP response.
   * @returns {Promise<void>} Response completion.
   */
  const handleHttp = (_request, response) =>
    bindEffectBoundary(async (/** @type {AllowEffects} */ allowEffects) => {
      const result = await run(allowEffects);
      sendResponse(allowEffects, response, result);
    });
  return { scheduled, http: handleHttp };
}

/**
 * Register tree-visibility regeneration handlers.
 * @param {import('../../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {(permission: import('../../../../types/allow-effects').AllowEffects, handler: () => Promise<null>) => unknown} registerScheduled Scheduled registration adapter.
 * @param {(permission: import('../../../../types/allow-effects').AllowEffects, handler: (request: import('express').Request, response: import('express').Response) => Promise<void>) => unknown} registerHttp HTTP registration adapter.
 * @param {{scheduled: () => Promise<null>, http: (request: import('express').Request, response: import('express').Response) => Promise<void>}} handlers Runtime handlers.
 * @returns {{scheduled: unknown, http: unknown}} Registered entrypoints.
 */
export function createTreeVisibilityRegenerationHandles(
  allowEffects,
  registerScheduled,
  registerHttp,
  handlers
) {
  return {
    scheduled: registerScheduled(allowEffects, handlers.scheduled),
    http: registerHttp(allowEffects, handlers.http),
  };
}
