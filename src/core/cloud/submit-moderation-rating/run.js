import { getAllowedOrigins } from '../cors-config.js';
import {
  createHandleSubmitModerationRating,
  createSubmitModerationRatingMiddleware,
  createSubmitModerationRatingResponder,
  createCorsOptions,
} from './submit-moderation-rating-core.js';
import { createModerationRatingDependencies } from './dependencies.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/** @typedef {{ use: (middleware: unknown) => void, post: (path: string, handler: unknown) => void }} ModerationApp */

/**
 * Wire and return submit-moderation-rating cloud exports.
 * @param {AllowEffects} startupAllowEffects Permission for startup effects.
 * @param {{
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   express: (() => ModerationApp) & { json: () => unknown },
 *   cors: (options: ReturnType<typeof createCorsOptions>) => unknown,
 *   getAuth: () => { verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined> },
 *   FieldValue: { delete: () => unknown, serverTimestamp: () => unknown },
 *   db: { collection: (name: string) => { doc: (id: string) => { path: string, get: () => Promise<{ exists: boolean, data: () => unknown }> } }, doc: (path: string) => { path: string, get: () => Promise<{ exists: boolean, data: () => unknown }> } },
 *   crypto: { randomUUID: () => string },
 *   getEnvironmentVariables: () => Record<string, unknown>,
 *   updateModeratorAssignment: typeof import('../../../cloud/submit-moderation-rating/firestore-effect-adapters.js').updateModeratorAssignment,
 *   recordRating: typeof import('../../../cloud/submit-moderation-rating/firestore-effect-adapters.js').recordRating,
 *   registerHttpEndpoint: typeof import('../../../cloud/http-endpoint-effect-adapter.js').registerHttpEndpoint,
 *   sendResponse: typeof import('../../../cloud/submit-moderation-rating/effect-adapters.js').sendModerationRatingResponse,
 *   bindHttpBoundary: typeof import('../../../cloud/allow-effects.js').createEffectHttpBoundary,
 * }} deps Cloud wiring dependencies.
 * @returns {{ submitModerationRating: unknown, handleSubmitModerationRating: unknown, app: ModerationApp }} Wired cloud export objects.
 */
export function runSubmitModerationRating(startupAllowEffects, deps) {
  const auth = deps.getAuth();
  const dependencies = createModerationRatingDependencies({
    db: deps.db,
    auth,
    FieldValue: deps.FieldValue,
    crypto: deps.crypto,
    updateModeratorAssignment: deps.updateModeratorAssignment,
    recordRating: deps.recordRating,
  });
  const responder = createSubmitModerationRatingResponder(dependencies);
  const handleSubmitModerationRating = createHandleSubmitModerationRating(
    responder,
    deps.sendResponse
  );

  const middleware = createSubmitModerationRatingMiddleware({
    express: deps.express,
    cors: deps.cors,
    allowedOrigins: getAllowedOrigins(deps.getEnvironmentVariables()),
  });
  const publicHandler = deps.bindHttpBoundary(handleSubmitModerationRating);
  const endpoint = deps.registerHttpEndpoint(startupAllowEffects, {
    express: deps.express,
    middleware,
    route: { method: 'post', path: '/', handler: publicHandler },
    functions: deps.functions,
  });

  return {
    submitModerationRating: endpoint.handle,
    handleSubmitModerationRating,
    app: /** @type {ModerationApp} */ (endpoint.app),
  };
}
