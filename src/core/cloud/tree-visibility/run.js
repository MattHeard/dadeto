import { regenerateDirtyTreeWeightVariants } from './tree-visibility-regeneration-core.js';

/**
 * Create the scheduled and HTTP regeneration handlers.
 * @param {() => import('firebase-admin/firestore').Firestore} getFirestoreInstance Firestore accessor.
 * @param {(snapshot: unknown) => Promise<unknown>} render Renderer.
 * @param {(message: string, ...args: unknown[]) => void} consoleError Error logger.
 * @returns {{scheduled: () => Promise<null>, http: (request: import('express').Request, response: import('express').Response) => Promise<void>}} Runtime handlers.
 */
export function createTreeVisibilityRegenerationHandlers(
  getFirestoreInstance,
  render,
  consoleError = console.error
) {
  const run = async () => {
    const result = await regenerateDirtyTreeWeightVariants({
      db: /** @type {any} */ (getFirestoreInstance()),
      renderVariant: render,
      consoleError,
    });
    return result;
  };
  const scheduled = async () => {
    await run();
    return null;
  };
  /**
   * @param {import('express').Request} _request HTTP request.
   * @param {import('express').Response} response HTTP response.
   * @returns {Promise<void>} Response completion.
   */
  const handleHttp = async (_request, response) => {
    response.status(200).json(await run());
  };
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
