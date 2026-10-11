/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Send one permission-gated CDN invalidation request.
 * @param {AllowEffects} permission Explicit invalidation permission.
 * @param {{ effectFetchFn: (permission: AllowEffects, url: string, init?: object) => Promise<Response>, project: string | undefined, resolvedUrlMap: string, resolvedCdnHost: string, randomUUID: () => string, token: string }} deps Effect transport and request details.
 * @param {string} path CDN path to invalidate.
 * @returns {Promise<Response>} API response.
 */
export function sendInvalidateRequest(permission, deps, path) {
  const effectFetchFn = deps.effectFetchFn;
  const project = deps.project;
  const resolvedUrlMap = deps.resolvedUrlMap;
  const resolvedCdnHost = deps.resolvedCdnHost;
  const randomUUID = deps.randomUUID;
  const token = deps.token;

  const url = new URL(
    `https://compute.googleapis.com/compute/v1/projects/${project}/global/urlMaps/${resolvedUrlMap}/invalidateCache`
  ).href;
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  const requestBody = JSON.stringify({
    host: resolvedCdnHost,
    path,
    requestId: randomUUID(),
  });
  return effectFetchFn(permission, url, {
    headers,
    method: 'POST',
    body: requestBody,
  });
}
