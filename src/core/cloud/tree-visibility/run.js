import { regenerateDirtyTreeWeightVariants } from './tree-visibility-regeneration-core.js';

/**
 * Build scheduled and HTTP regeneration entrypoints.
 * @param {{
 *   functions: {
 *     region: (name: string) => {
 *       pubsub: { schedule: (cron: string) => { onRun: (handler: () => Promise<null>) => unknown } },
 *       https: { onRequest: (handler: (request: import('express').Request, response: import('express').Response) => Promise<void>) => unknown },
 *     },
 *   },
 *   getFirestoreInstance: () => import('firebase-admin/firestore').Firestore,
 *   render: (snapshot: unknown) => Promise<unknown>,
 *   consoleError?: (message: string, ...args: unknown[]) => void,
 * }} options Runtime dependencies.
 * @returns {{scheduled: unknown, http: unknown}} Registered entrypoints.
 */
/* istanbul ignore next -- default handlers are cloud-run wiring fallbacks. */
export function createTreeVisibilityRegenerationHandles({
  functions,
  getFirestoreInstance,
  render,
  consoleError = console.error,
}) {
  const run = async () => {
    const result = await regenerateDirtyTreeWeightVariants({
      db: getFirestoreInstance(),
      renderVariant: render,
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
   * @param {import('express').Request} _request HTTP request.
   * @param {import('express').Response} response HTTP response.
   * @returns {Promise<void>} Response completion.
   */
  const handleHttp = async (_request, response) => {
    response.status(200).json(await run());
  };
  const http = functions.region('europe-west1').https.onRequest(handleHttp);
  return { scheduled, http };
}
