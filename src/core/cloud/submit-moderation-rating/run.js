import { getAllowedOrigins } from '../cors-config.js';
import {
  createHandleSubmitModerationRating,
  createSubmitModerationRatingMiddleware,
  createSubmitModerationRatingResponder,
} from './submit-moderation-rating-core.js';
import { createModerationRatingDependencies } from './dependencies.js';
import { createCloudHttpEndpoint } from '../http-endpoint-bootstrap.js';

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
 * @returns {{ submitModerationRating: unknown, handleSubmitModerationRating: (req: any, res: any) => Promise<void>, app: unknown }} Wired cloud export objects for index.js.
 */
export function runSubmitModerationRating(deps) {
  deps.createFirebaseAppManager(deps.initializeApp).ensureFirebaseApp();

  const handleSubmitModerationRating = createHandleSubmitModerationRating(
    /** @type {any} */ (createSubmitModerationRatingResponder(
      /** @type {any} */ (
      createModerationRatingDependencies({
        db: deps.getFirestoreInstance(),
        auth: deps.getAuth(),
        FieldValue: deps.FieldValue,
        crypto: deps.crypto,
      })
      )
    ))
  );

  const endpointOptions = /** @type {Parameters<typeof createCloudHttpEndpoint>[0]} */ ({
    express: deps.express,
    middleware: createSubmitModerationRatingMiddleware({
      express: deps.express,
      cors: deps.cors,
      allowedOrigins: getAllowedOrigins(deps.getEnvironmentVariables()),
    }),
    route: {
      method: 'post',
      path: '/',
      handler: handleSubmitModerationRating,
    },
    functions: deps.functions,
  });
  const { app, handle: submitModerationRating } =
    createCloudHttpEndpoint(endpointOptions);

  return { submitModerationRating, handleSubmitModerationRating, app };
}
