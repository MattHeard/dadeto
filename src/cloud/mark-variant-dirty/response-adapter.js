/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/**
 * Write an HTTP response at the cloud boundary.
 * @param {AllowEffects} permission Request permission.
 * @param {NativeHttpResponse} response Express response.
 * @param {number} status HTTP status code.
 * @param {'send' | 'json'} method Response method.
 * @param {unknown} body Response body.
 * @returns {void}
 */
export function sendHttpResponse(permission, response, status, method, body) {
  void permission;
  const target = response.status(status);
  target[method](body);
}
