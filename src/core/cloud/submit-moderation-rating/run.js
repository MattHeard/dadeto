// @ts-nocheck
import { getAllowedOrigins } from '../cors-config.js';
import {
  createHandleSubmitModerationRating,
  createSubmitModerationRatingApp,
  createSubmitModerationRatingResponder,
} from './submit-moderation-rating-core.js';
import { createModerationRatingDependencies } from './dependencies.js';

/**
 * Wire and return submit-moderation-rating cloud exports.
 * @param {{
 *   functions: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').functions,
 *   express: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').express,
 *   cors: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').cors,
 *   getAuth: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').getAuth,
 *   FieldValue: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').FieldValue,
 *   createFirebaseAppManager: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').createFirebaseAppManager,
 *   getFirestoreInstance: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').getFirestoreInstance,
 *   crypto: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').crypto,
 *   getEnvironmentVariables: typeof import('../../../../src/cloud/submit-moderation-rating/submit-moderation-rating-gcf.js').getEnvironmentVariables,
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 * }} deps Dependencies required to compose the submit-moderation-rating endpoint.
 * @returns {{ submitModerationRating: unknown, handleSubmitModerationRating: Function, app: unknown }} Wired cloud export objects for index.js.
 */
export function runSubmitModerationRating(deps) {
  deps.createFirebaseAppManager(deps.initializeApp).ensureFirebaseApp();

  const handleSubmitModerationRating = createHandleSubmitModerationRating(
    createSubmitModerationRatingResponder(
      createModerationRatingDependencies({
        db: deps.getFirestoreInstance(),
        auth: deps.getAuth(),
        FieldValue: deps.FieldValue,
        crypto: deps.crypto,
      })
    )
  );

  const app = createSubmitModerationRatingApp({
    express: deps.express,
    cors: deps.cors,
    allowedOrigins: getAllowedOrigins(deps.getEnvironmentVariables()),
    handleSubmit: handleSubmitModerationRating,
  });

  const submitModerationRating = deps.functions
    .region('europe-west1')
    .https.onRequest(app);

  return { submitModerationRating, handleSubmitModerationRating, app };
}
