export * from '../../core/cloud/assign-moderation-job/assign-moderation-job-core.js';
import { useMiddleware } from './effect-adapters.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */
/** @typedef {(req: import('../../../types/native-http').NativeHttpRequest, res: import('../../../types/native-http').NativeHttpResponse) => unknown} NativeHttpHandler */

/**
 * Register a POST handler on the Express application.
 * @param {AllowEffects} permission Permission for route registration.
 * @param {NativeExpressApp} app Express application.
 * @param {string} path Route path.
 * @param {NativeHttpHandler} handler Request handler.
 * @returns {void}
 */
function registerPostRoute(permission, app, path, handler) {
  void permission;
  app.post(path, handler);
}

/**
 * Persist a moderator assignment using Firestore merge semantics.
 * @param {AllowEffects} permission Permission for the Firestore write.
 * @param {import('firebase-admin/firestore').DocumentReference} reference Moderator document.
 * @param {object} data Assignment payload.
 * @returns {Promise<unknown>} Firestore write result.
 */
async function setModeratorAssignment(permission, reference, data) {
  void permission;
  return reference.set(data, { merge: true });
}

/**
 * Send an HTTP response with a status and body.
 * @param {AllowEffects} permission Permission for the response write.
 * @param {import('../../../types/native-http').NativeHttpResponse} response Express response.
 * @param {number} status HTTP status.
 * @param {unknown} body Response body.
 * @returns {void}
 */
function sendHttpResponse(permission, response, status, body) {
  void permission;
  response.status(status).send(body);
}

export { registerPostRoute, sendHttpResponse, setModeratorAssignment, useMiddleware };
