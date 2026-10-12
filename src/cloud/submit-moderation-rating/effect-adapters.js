import { sendResponseBody } from '../../core/cloud/response-utils.js';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {unknown} response @param {number} status @param {unknown} body */
export function sendModerationRatingResponse(permission, response, status, body) {
  void permission;
  sendResponseBody(
    /** @type {Parameters<typeof sendResponseBody>[0]} */ (response),
    status,
    body,
    typeof body === 'string' ? 'send' : 'json'
  );
}
