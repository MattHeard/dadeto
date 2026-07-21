import { regenerateDirtyTreeWeightVariants } from './tree-visibility-regeneration-core.js';

/**
 * Build scheduled and HTTP regeneration entrypoints.
 * @param {{functions: any, getFirestoreInstance: Function, render: Function, consoleError?: Function}} options Runtime dependencies.
 * @returns {{scheduled: unknown, http: unknown}} Registered entrypoints.
 */
export function createTreeVisibilityRegenerationHandles({
  functions,
  getFirestoreInstance,
  render,
  consoleError = console.error,
}) {
  const run = async () => {
    const result = await regenerateDirtyTreeWeightVariants({
      db: getFirestoreInstance(),
      renderVariant: /** @type {(snap: any) => Promise<unknown>} */ (render),
      consoleError,
    });
    return result;
  };
  const scheduled = functions
    .region('europe-west1')
    .pubsub.schedule('every 24 hours')
    .onRun(async () => {
      await run();
      return null;
    });
  /**
   * @param {any} _request HTTP request.
   * @param {any} response HTTP response.
   * @returns {Promise<void>} Response completion.
   */
  const handleHttp = async (_request, response) => {
    response.status(200).json(await run());
  };
  const http = functions.region('europe-west1').https.onRequest(handleHttp);
  return { scheduled, http };
}
