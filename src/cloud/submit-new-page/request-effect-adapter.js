/**
 * Write an HTTP response for a completed submission.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Request permission.
 * @param {{ status: (code: number) => { json: (body: unknown) => unknown } }} response Express response.
 * @param {number} status HTTP status.
 * @param {unknown} body Response body.
 * @returns {unknown} Response result.
 */
export function sendSubmitNewPageResponse(allowEffects, response, status, body) {
  void allowEffects;
  return response.status(status).json(body);
}
