import { normalizeMethod } from './cloud-core.js';

/**
 * Response emitted when a non-POST verb reaches a POST-only endpoint.
 * @type {{ status: number, body: string }}
 */
export const METHOD_NOT_ALLOWED_RESPONSE = {
  status: 405,
  body: 'POST only',
};

/**
 * Validate that a method is POST, returning an error response when it is not.
 * @param {string | undefined} method HTTP method to inspect.
 * @param {{ status: number, body: string }} [errorResponse] Override error response payload.
 * @param options
 * @returns {{ status: number, body: string } | null} Error response when the method is not POST.
 */
export function validatePostMethod(
  method,
  errorResponse = METHOD_NOT_ALLOWED_RESPONSE,
  options = {}
) {
  const normalized = normalizeMethod(method);
  const normalizedMethod =
    normalized || (options.treatNonStringAsPost ? 'POST' : normalized);
  if (normalizedMethod === 'POST') {
    return null;
  }

  return errorResponse;
}
