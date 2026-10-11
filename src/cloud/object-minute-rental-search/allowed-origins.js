/**
 * Resolve configured CORS origins once when the cloud handler is composed.
 * @param {Record<string, string|undefined>} env Runtime environment.
 * @param {string[]} [configuredOrigins] Explicit origin allowlist.
 * @returns {string[]} Allowed request origins.
 */
export function resolveSearchHttpAllowedOrigins(env, configuredOrigins) {
  return (
    configuredOrigins ??
    String(env.SEARCH_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  );
}
