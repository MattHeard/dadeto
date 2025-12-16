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
 * Check that the provided method is POST, applying optional overrides.
 * @param {unknown} method Candidate HTTP verb.
 * @param {{ status: number, body: string }} [errorResponse] Response when validation fails.
 * @param {{ treatNonStringAsPost?: boolean }} [options] Configuration toggles that adjust guarding behavior.
 * @returns {{ status: number, body: string } | null} Response when the method is invalid.
 */
export function validatePostMethod(
  method,
  errorResponse = METHOD_NOT_ALLOWED_RESPONSE,
  options = {}
) {
  return methodGuard(normalizeMethod(method), options, errorResponse);
}

/**
 * Resolve the guard response for a normalized method.
 * @param {string} normalized Normalized HTTP verb.
 * @param {{ treatNonStringAsPost?: boolean }} options Optional override flags.
 * @param {{ status: number, body: string }} errorResponse Response returned on failure.
 * @returns {{ status: number, body: string } | null} Guard outcome.
 */
function methodGuard(normalized, options, errorResponse) {
  if (normalized === 'POST') {
    return null;
  }

  return handleNonPost(normalized, options, errorResponse);
}

/**
 * Handle POST guard for non-POST verbs.
 * @param {string} normalized Normalized HTTP verb.
 * @param {{ treatNonStringAsPost?: boolean }} options Flags that adjust behavior.
 * @param {{ status: number, body: string }} errorResponse Response returned on failure.
 * @returns {{ status: number, body: string } | null} Guard outcome.
 */
function handleNonPost(normalized, options, errorResponse) {
  if (normalized === '' && options.treatNonStringAsPost) {
    return null;
  }

  return errorResponse;
}
