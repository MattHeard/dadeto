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
  consoleError = (...args) => console.error(...args),
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
  const http = functions
    .region('europe-west1')
    .https.onRequest(async (_request, response) => {
      response.status(200).json(await run());
    });
  return { scheduled, http };
}
