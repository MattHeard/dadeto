const ENABLED_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Check whether local writer HTTPS mode is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when the writer server should use HTTPS.
 */
export function isWriterHttpsEnabled(env) {
  return isEnabledEnvValue(env.WRITER_HTTPS);
}

/**
 * Check whether local writer request logging is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when request logging should be enabled.
 */
export function isWriterRequestLogEnabled(env) {
  return isEnabledEnvValue(env.WRITER_REQUEST_LOG);
}

/**
 * Build the startup URL shown in local server logs.
 * @param {number} serverPort Port number.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {string} Writer app URL.
 */
export function getWriterUrl(serverPort, env) {
  const protocol = {
    true: 'https',
    false: 'http',
  }[String(isWriterHttpsEnabled(env))];
  return `${protocol}://localhost:${serverPort}/writer/`;
}

/**
 * Decide whether a response Location header should be set.
 * @param {string | undefined} location Optional redirect location.
 * @returns {boolean} Whether the response should include Location.
 */
export function shouldSetResponseLocation(location) {
  return Boolean(location);
}

/**
 * Check whether an environment value enables a local feature.
 * @param {string | undefined} value Environment value.
 * @returns {boolean} True when the value is an enabled flag.
 */
function isEnabledEnvValue(value) {
  return ENABLED_ENV_VALUES.has((value ?? '').trim().toLowerCase());
}
