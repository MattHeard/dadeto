import {
  requireOpenAiApiKey,
  resolveApiKeyOption,
  resolveFormDataCtor,
  resolveOpenAiApiKeyValue,
  resolveOpenAiEnv,
  resolveRealtimeCallsUrl,
  resolveSessionConfigJson,
  readRealtimeCallResponse,
} from '../cloud/realtime-call/realtime-options.js';

export const OPENAI_REALTIME_CALLS_URL =
  'https://api.openai.com/v1/realtime/calls';

/**
 * Resolve the API key used by the Realtime session server.
 * @param {Record<string, string | undefined>} env Environment variables.
 * @returns {string} OpenAI API key.
 */
export function resolveOpenAiApiKey(env) {
  return resolveOpenAiApiKeyValue(resolveOpenAiEnv(env).OPENAI_API_KEY);
}

/**
 * Resolve the environment map used for API key lookup.
 * @param {Record<string, string | undefined> | undefined} env Environment variables.
 * @returns {Record<string, string | undefined>} Environment variables.
 */

/**
 * Normalize an API key candidate.
 * @param {string | undefined} apiKey API key candidate.
 * @returns {string} API key or empty string.
 */

/**
 * Build the multipart form body sent to OpenAI's Realtime WebRTC endpoint.
 * @param {string} sdpOffer Browser-generated SDP offer.
 * @param {{FormDataCtor?: typeof FormData, sessionConfigJson?: string}} [options]
 *   Injectable dependencies for tests.
 * @returns {FormData} Multipart form data.
 */
export function buildRealtimeCallForm(sdpOffer, options = {}) {
  const form = new (resolveFormDataCtor(options))();
  form.set('sdp', sdpOffer);
  form.set('session', resolveSessionConfigJson(options));
  return form;
}

/**
 * Exchange a browser SDP offer for OpenAI's SDP answer without exposing the API key.
 * @param {string} sdpOffer Browser-generated SDP offer.
 * @param {{apiKey?: string, fetchImpl: typeof fetch, url?: string}} options
 *   Injectable dependencies for tests.
 * @returns {Promise<{sdpAnswer: string, location: string}>} SDP answer and optional call location.
 */
export async function exchangeRealtimeCallSdp(sdpOffer, options) {
  const exchangeOptions = options ?? {};
  const fetchImpl = exchangeOptions.fetchImpl ?? globalThis.fetch;
  const response = await postRealtimeCall(
    sdpOffer,
    exchangeOptions,
    requireOpenAiApiKey(
      resolveApiKeyOption(exchangeOptions, () =>
        resolveOpenAiApiKey(process.env)
      )
    ),
    fetchImpl
  );
  return readRealtimeCallResponse(response);
}

/**
 * Resolve an injectable FormData constructor.
 * @param {{FormDataCtor?: typeof FormData}} options Form build options.
 * @returns {typeof FormData} FormData constructor.
 */

/**
 * Resolve the serialized session config.
 * @param {{sessionConfigJson?: string}} options Form build options.
 * @returns {string} Session config JSON.
 */

/**
 * Resolve the supplied or environment OpenAI API key.
 * @param {{apiKey?: string}} options Exchange options.
 * @returns {string} API key candidate.
 */

/**
 * Require a non-empty OpenAI API key.
 * @param {string} apiKey API key candidate.
 * @returns {string} API key.
 */

/**
 * Post the Realtime SDP form to OpenAI.
 * @param {string} sdpOffer Browser-generated SDP offer.
 * @param {{fetchImpl?: typeof fetch, url?: string}} options Exchange options.
 * @param {string} apiKey OpenAI API key.
 * @param {typeof fetch} fetchImpl Fetch implementation.
 * @returns {Promise<Response>} OpenAI response.
 */
function postRealtimeCall(sdpOffer, options, apiKey, fetchImpl) {
  return fetchImpl(
    resolveRealtimeCallsUrl(options, OPENAI_REALTIME_CALLS_URL),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: buildRealtimeCallForm(sdpOffer),
    }
  );
}

/**
 * Resolve the Realtime calls endpoint URL.
 * @param {{url?: string}} options Exchange options.
 * @returns {string} Endpoint URL.
 */

/**
 * Read and validate OpenAI's Realtime response.
 * @param {Response} response OpenAI fetch response.
 * @returns {Promise<{sdpAnswer: string, location: string}>} SDP answer and optional location.
 */
