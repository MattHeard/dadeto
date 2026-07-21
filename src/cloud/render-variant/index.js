import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  Storage,
  createFirebaseAppManager,
  getFirestoreInstance,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './render-variant-gcf.js';
import { runRenderVariant } from '../../core/cloud/render-variant/run.js';
import { regenerateDirtyTreeWeightVariants } from '../../core/cloud/tree-visibility/tree-visibility-regeneration-core.js';

const { renderVariant: handle, render } = runRenderVariant({
  initializeApp,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
  functions,
  FieldValue,
  Storage,
  fetchFn,
  crypto,
});

export { handle, render };

export const regenerateTreeWeights = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = getFirestoreInstance();
    await regenerateDirtyTreeWeightVariants({
      db,
      renderVariant: render,
      consoleError: (...args) => console.error(...args),
    });
    return null;
  });
