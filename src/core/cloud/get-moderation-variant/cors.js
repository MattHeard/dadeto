/**
 * Determine whether the provided origin exists in the supplied whitelist.
 * @param {string[] | undefined | null} origins Candidate origins.
 * @param {string} origin Origin reported by the request.
 * @returns {boolean} True when the whitelist contains the origin.
 */
function includesOrigin(origins, origin) {
  return Array.isArray(origins) && origins.includes(origin);
}

/**
 * Determine whether the provided origin is allowed by the configuration.
 * @param {string | undefined | null} origin Origin reported by the request.
 * @param {string[] | undefined | null} origins Whitelist of allowed origins.
 * @returns {boolean} True when the origin is permitted.
 */
export function isAllowedOrigin(origin, origins) {
  if (origin) {
    return includesOrigin(origins, origin);
  }

  return true;
}
