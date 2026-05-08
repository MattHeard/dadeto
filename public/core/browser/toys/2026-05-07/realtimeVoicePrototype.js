const DEFAULT_ENDPOINT = '/api/realtime/call';
const DEFAULT_TITLE = 'Realtime Voice Prototype';
const DEFAULT_DESCRIPTION =
  'Press Connect, grant microphone permission, speak, and listen for streamed OpenAI Realtime audio.';
const DEFAULT_SERVER = 'local';
const SERVER_LABELS = {
  cloud: 'cloud server',
  local: 'local server',
};

/**
 * Build the browser-safe payload used by the Realtime voice output presenter.
 * @param {string} input JSON config selecting `local` or `cloud` server mode.
 * @returns {string} JSON payload consumed by the realtime-voice presenter.
 */
export function realtimeVoicePrototype(input = '') {
  const config = parseInputConfig(input);
  const server = getServer(config.server);
  const endpoint = getEndpoint(server, config);
  return JSON.stringify({
    title: stringOr(config.title, DEFAULT_TITLE),
    description: stringOr(config.description, DEFAULT_DESCRIPTION),
    server,
    serverLabel: SERVER_LABELS[server],
    endpoint,
    endpointError: getEndpointError(server, endpoint),
  });
}

/**
 * Parse optional toy JSON config.
 * @param {string} input Raw toy input.
 * @returns {Record<string, unknown>} Parsed config or an empty config.
 */
function parseInputConfig(input) {
  try {
    return parseConfigObject(JSON.parse(input));
  } catch {
    return {};
  }
}

/**
 * Keep only object-shaped parsed config values.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {Record<string, unknown>} Parsed config object or empty config.
 */
function parseConfigObject(parsed) {
  if (!isConfigRecord(parsed)) {
    return {};
  }

  return /** @type {Record<string, unknown>} */ (parsed);
}

/**
 * Check whether a parsed value can be used as a config record.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {boolean} True when parsed is an object record.
 */
function isConfigRecord(parsed) {
  return Boolean(parsed) && isObjectRecord(parsed);
}

/**
 * Check whether a parsed value is a non-array object.
 * @param {unknown} parsed Parsed JSON value.
 * @returns {boolean} True when parsed is a non-array object.
 */
function isObjectRecord(parsed) {
  return typeof parsed === 'object' && !Array.isArray(parsed);
}

/**
 * Resolve selected server mode.
 * @param {unknown} server Candidate server mode.
 * @returns {'local' | 'cloud'} Server mode.
 */
function getServer(server) {
  if (server === 'cloud') {
    return 'cloud';
  }

  return DEFAULT_SERVER;
}

/**
 * Resolve the endpoint for a selected server mode.
 * @param {'local' | 'cloud'} server Server mode.
 * @param {Record<string, unknown>} config Parsed config.
 * @returns {string} Endpoint path or URL.
 */
function getEndpoint(server, config) {
  if (server === 'cloud') {
    return stringOr(config.cloudEndpoint, '');
  }

  return stringOr(config.localEndpoint, DEFAULT_ENDPOINT);
}

/**
 * Resolve a browser-safe endpoint validation message.
 * @param {'local' | 'cloud'} server Server mode.
 * @param {string} endpoint Endpoint path or URL.
 * @returns {string} Empty string when endpoint can be used.
 */
function getEndpointError(server, endpoint) {
  if (server !== 'cloud') {
    return '';
  }

  return getCloudEndpointError(endpoint);
}

/**
 * Resolve a cloud endpoint validation message.
 * @param {string} endpoint Cloud endpoint.
 * @returns {string} Empty string when cloud endpoint is configured.
 */
function getCloudEndpointError(endpoint) {
  if (endpoint) {
    return '';
  }

  return 'Cloud server mode requires a cloudEndpoint URL.';
}

/**
 * Resolve a string fallback.
 * @param {unknown} candidate Candidate value.
 * @param {string} fallback Fallback value.
 * @returns {string} Candidate or fallback.
 */
function stringOr(candidate, fallback) {
  if (!isNonEmptyString(candidate)) {
    return fallback;
  }

  return candidate;
}

/**
 * Check whether a candidate is a non-empty string.
 * @param {unknown} candidate Candidate value.
 * @returns {boolean} True when candidate is a non-empty string.
 */
function isNonEmptyString(candidate) {
  return typeof candidate === 'string' && Boolean(candidate.trim());
}
