import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  Storage,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
} from './update-variant-visibility-gcf.js';
import { createUpdateVariantVisibilityHandler } from '../../core/cloud/update-variant-visibility/update-variant-visibility-core.js';
import { createRenderContentsEntrypoint } from '../../core/cloud/render-contents/index.js';

const renderContentsEntrypoint = createRenderContentsEntrypoint({
  initializeApp,
  functions,
  Storage,
  getAuth,
  createFirebaseAppManager,
  getFirestoreInstance,
  ADMIN_UID,
  fetchFn,
  crypto,
  getEnvironmentVariables,
});

const handle = functions
  .region('europe-west1')
  .firestore.document('moderationRatings/{ratingId}')
  .onCreate(
    createUpdateVariantVisibilityHandler({
      db: getFirestoreInstance(),
      renderContents: renderContentsEntrypoint.render,
    })
  );

export { handle };
