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
export function validatePostMethod(method, errorResponse, options) {
  return methodGuard(
    normalizeMethod(method),
    resolveGuardOptions(options),
    resolveErrorResponse(errorResponse)
  );
}

/**
 * Run a callback only when the method is POST.
 * @template T
 * @param {{
 *   method: unknown,
 *   onValid: () => T,
 *   onInvalid: (errorResponse: { status: number, body: string }) => T,
 *   options?: { treatNonStringAsPost?: boolean }
 * }} params Method gating configuration.
 * @returns {T} Callback result for the valid or invalid method path.
 */
export function whenPostMethod({ method, onValid, onInvalid, options }) {
  const methodError = validatePostMethod(method, undefined, options);
  if (methodError) {
    return onInvalid(methodError);
  }

  return onValid();
}

/**
 * Run a callback only when the request method is POST.
 * @template T
 * @param {{
 *   request: { method?: unknown },
 *   onValid: () => T,
 *   onInvalid: (errorResponse: { status: number, body: string }) => T,
 *   options?: { treatNonStringAsPost?: boolean }
 * }} params Request gating configuration.
 * @returns {T} Callback result for the valid or invalid request path.
 */
export function whenPostRequest({ request, onValid, onInvalid, options }) {
  return whenPostMethod({
    method: request.method,
    onValid,
    onInvalid,
    options,
  });
}

/**
 * @param {{ status: number, body: string } | undefined} errorResponse Response when validation fails.
 * @returns {{ status: number, body: string }} Normalized error response.
 */
function resolveErrorResponse(errorResponse) {
  return errorResponse ?? METHOD_NOT_ALLOWED_RESPONSE;
}

/**
 * @param {{ treatNonStringAsPost?: boolean } | undefined} options Guard configuration.
 * @returns {{ treatNonStringAsPost?: boolean }} Normalized guard options.
 */
function resolveGuardOptions(options) {
  return options ?? {};
}

/**
 * Resolve the guard response for a normalized method.
 * @param {string} normalized Normalized HTTP verb.
 * @param {{ treatNonStringAsPost?: boolean }} options Optional override flags.
 * @param {{ status: number, body: string }} errorResponse Response returned on failure.
 * @returns {{ status: number, body: string } | null} Guard outcome.
 */
function methodGuard(normalized, options, errorResponse) {
  if (isPostMethod(normalized)) {
    return null;
  }

  return handleNonPost(normalized, options, errorResponse);
}

/**
 * @param {string} normalized Normalized HTTP verb.
 * @returns {boolean} True when the verb is POST.
 */
function isPostMethod(normalized) {
  return normalized === 'POST';
}

/**
 * Handle POST guard for non-POST verbs.
 * @param {string} normalized Normalized HTTP verb.
 * @param {{ treatNonStringAsPost?: boolean }} options Flags that adjust behavior.
 * @param {{ status: number, body: string }} errorResponse Response returned on failure.
 * @returns {{ status: number, body: string } | null} Guard outcome.
 */
function handleNonPost(normalized, options, errorResponse) {
  if (shouldTreatNonStringAsPost(normalized, options)) {
    return null;
  }

  return errorResponse;
}

/**
 * @param {string} normalized Normalized HTTP verb.
 * @param {{ treatNonStringAsPost?: boolean }} options Guard configuration.
 * @returns {boolean} True when empty verbs should be treated as POST.
 */
function shouldTreatNonStringAsPost(normalized, options) {
  return normalized === '' && options.treatNonStringAsPost;
}
