import { buildRealtimeVoiceSessionConfigJson } from './session-config.js';

/**
 * Read and validate OpenAI's Realtime response.
 * @param {Response} response OpenAI response.
 * @returns {Promise<{sdpAnswer: string, location: string}>} Parsed response.
 */
export async function readRealtimeCallResponse(response) {
  const sdpAnswer = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenAI Realtime call failed with status ${response.status}.`
    );
  }
  return { sdpAnswer, location: response.headers.get('location') ?? '' };
}

/**
 * Resolve the environment map.
 * @param {Record<string, string | undefined> | undefined} env Environment variables.
 * @returns {Record<string, string | undefined>} Environment map.
 */
export function resolveOpenAiEnv(env) {
  if (env === undefined) return process.env;
  return env;
}

/**
 * Normalize an API key candidate.
 * @param {string | undefined} apiKey API key candidate.
 * @returns {string} Normalized key.
 */
export function resolveOpenAiApiKeyValue(apiKey) {
  if (apiKey === undefined) return '';
  return apiKey;
}

/**
 * Resolve an injectable FormData constructor.
 * @param {{ FormDataCtor?: typeof FormData }} options Form options.
 * @returns {typeof FormData} Constructor.
 */
export function resolveFormDataCtor(options) {
  if (options.FormDataCtor === undefined) return FormData;
  return options.FormDataCtor;
}

/**
 * Resolve serialized session configuration.
 * @param {{ sessionConfigJson?: string }} options Session options.
 * @returns {string} Session JSON.
 */
export function resolveSessionConfigJson(options) {
  if (options.sessionConfigJson === undefined)
    return buildRealtimeVoiceSessionConfigJson();
  return options.sessionConfigJson;
}

/**
 * Resolve the supplied or environment API key.
 * @param {{ apiKey?: string }} options Exchange options.
 * @param {() => string} resolveKey Environment key resolver.
 * @returns {string} API key candidate.
 */
export function resolveApiKeyOption(options, resolveKey) {
  if (options.apiKey === undefined) return resolveKey();
  return options.apiKey;
}

/**
 * Require a non-empty API key.
 * @param {string} apiKey API key candidate.
 * @returns {string} Required API key.
 */
export function requireOpenAiApiKey(apiKey) {
  if (!apiKey)
    throw new Error('OPENAI_API_KEY is required for Realtime calls.');
  return apiKey;
}

/**
 * Resolve the Realtime endpoint URL.
 * @param {{ url?: string }} options Exchange options.
 * @param {string} defaultUrl Default endpoint URL.
 * @returns {string} Endpoint URL.
 */
export function resolveRealtimeCallsUrl(options, defaultUrl) {
  if (options.url === undefined) return defaultUrl;
  return options.url;
}
