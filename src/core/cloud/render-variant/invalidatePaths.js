/**
 * @typedef {Object} InvalidateDependencies
 * @property {(url: string, init: RequestInit) => Promise<Response>} fetchJson
 * @property {() => string} generateId
 * @property {(message: string, error?: unknown) => void} logError
 */

/**
 * @param {InvalidateDependencies} deps
 * @returns {(options: {
 *   projectId: string,
 *   urlMap: string,
 *   cdnHost: string,
 *   paths: string[],
 *   getAccessToken: () => Promise<string>,
 * }) => Promise<void>}
 */
export const createInvalidatePaths = ({ fetchJson, generateId, logError }) => {
  if (typeof fetchJson !== 'function') {
    throw new TypeError('fetchJson must be a function');
  }
  if (typeof generateId !== 'function') {
    throw new TypeError('generateId must be a function');
  }
  if (typeof logError !== 'function') {
    throw new TypeError('logError must be a function');
  }

  return async ({ projectId, urlMap, cdnHost, paths, getAccessToken }) => {
    if (!Array.isArray(paths)) {
      throw new TypeError('paths must be an array');
    }
    if (typeof getAccessToken !== 'function') {
      throw new TypeError('getAccessToken must be a function');
    }

    const token = await getAccessToken();
    await Promise.all(
      paths.map(async path => {
        try {
          const response = await fetchJson(
            `https://compute.googleapis.com/compute/v1/projects/${projectId}/global/urlMaps/${urlMap}/invalidateCache`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host: cdnHost,
                path,
                requestId: generateId(),
              }),
            }
          );

          if (response && Object.prototype.hasOwnProperty.call(response, 'ok') && response.ok === false) {
            const status = response?.status ?? 'unknown';
            logError(`invalidate ${path} failed: ${status}`);
          }
        } catch (error) {
          logError(`invalidate ${path} error`, error?.message || error);
        }
      })
    );
  };
};
