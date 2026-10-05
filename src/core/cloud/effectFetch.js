/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Send one explicitly permitted cache invalidation request.
 * @template TResponse Response shape supplied by the injected transport.
 * @param {AllowEffects} permission Permission for this cache purge.
 * @param {(permission: AllowEffects, url: string, init?: object) => Promise<TResponse>} effectFetchFn Permission-aware purge transport.
 * @param {string} url Cache invalidation endpoint.
 * @param {object} init Request method, headers, and body.
 * @returns {Promise<TResponse>} Purge response.
 */
export function sendEffectFetch(permission, effectFetchFn, url, init) {
  return effectFetchFn(permission, url, init);
}
