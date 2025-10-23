/**
 * Determine whether the provided origin is allowed by the configuration.
 * @param {string | undefined | null} origin Origin reported by the request.
 * @param {string[] | undefined | null} origins Whitelist of allowed origins.
 * @returns {boolean} True when the origin is permitted.
 */
export function isAllowedOrigin(origin, origins) {
  if (!origin) {
    return true;
  }

  if (!Array.isArray(origins)) {
    return false;
  }

  return origins.includes(origin);
}
