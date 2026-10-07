/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Send one permission-gated CDN invalidation request.
 * @param {AllowEffects} permission Explicit invalidation permission.
 * @param {{ effectFetchFn: (permission: AllowEffects, url: string, init?: object) => Promise<Response>, project: string | undefined, resolvedUrlMap: string, resolvedCdnHost: string, randomUUID: () => string, token: string }} deps Effect transport and request details.
 * @param {string} path CDN path to invalidate.
 * @returns {Promise<Response>} API response.
 */
export function sendInvalidateRequest(
  permission,
  {
    effectFetchFn,
    project,
    resolvedUrlMap,
    resolvedCdnHost,
    randomUUID,
    token,
  },
  path
) {
  return effectFetchFn(
    permission,
    `https://compute.googleapis.com/compute/v1/projects/${project}/global/urlMaps/${resolvedUrlMap}/invalidateCache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: resolvedCdnHost,
        path,
        requestId: randomUUID(),
      }),
    }
  );
}
