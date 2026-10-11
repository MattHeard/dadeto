/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Send a JSON response.
 * @param {AllowEffects} permission Request permission.
 * @param {NativeHttpResponse} response HTTP response.
 * @param {number} status HTTP status.
 * @param {unknown} body Response body.
 * @returns {void}
 */
export function sendJsonResponse(permission, response, status, body) {
  void permission;
  response.status(status).json(body);
}

/**
 * Send a text response.
 * @param {AllowEffects} permission Request permission.
 * @param {NativeHttpResponse} response HTTP response.
 * @param {number} status HTTP status.
 * @param {unknown} body Response body.
 * @returns {void}
 */
export function sendHttpResponse(permission, response, status, body) {
  void permission;
  response.status(status).send(body);
}

/**
 * Write an error to the cloud runtime log.
 * @param {AllowEffects} permission Request permission.
 * @param {unknown} error Logged error.
 * @returns {void}
 */
export function logError(permission, error) {
  void permission;
  console.error(error);
}
