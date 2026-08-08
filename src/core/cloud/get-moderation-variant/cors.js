import { isAllowedOrigin as isAllowedOriginCore } from './get-moderation-variant-core.js';

/**
 * Check an origin through the shared moderation-variant CORS policy.
 * @param {string | null | undefined} origin Request origin.
 * @param {string[] | null | undefined} allowedOrigins Configured origins.
 * @returns {boolean} Whether the origin is allowed.
 */
export const isAllowedOrigin = (origin, allowedOrigins) =>
  isAllowedOriginCore(origin, allowedOrigins);
