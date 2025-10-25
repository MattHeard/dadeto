/**
 * Validate admin token action dependencies and produce a handler.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   getAdminEndpointsFn: () => Promise<object>,
 *   fetchFn: import('./core.js').FetchFn,
 *   showMessage: (text: string) => void,
 *   missingTokenMessage: string,
 *   action: ({
 *     token: string,
 *     getAdminEndpoints: () => Promise<object>,
 *     fetchFn: import('./core.js').FetchFn,
 *     showMessage: (text: string) => void,
 *   }) => Promise<void>,
 * }} options - Dependencies and configuration for the admin action.
 * @returns {() => Promise<void>} Handler guarded by the shared validation logic.
 */
export function createAdminTokenAction({
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage,
  missingTokenMessage,
  action,
}) {
  if (!googleAuth || typeof googleAuth.getIdToken !== 'function') {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }
  if (typeof showMessage !== 'function') {
    throw new TypeError('showMessage must be a function');
  }
  if (typeof action !== 'function') {
    throw new TypeError('action must be a function');
  }

  return async function adminTokenAction() {
    const token = googleAuth.getIdToken();
    if (!token) {
      showMessage(missingTokenMessage);
      return;
    }

    await action({
      token,
      getAdminEndpoints: getAdminEndpointsFn,
      fetchFn,
      showMessage,
    });
  };
}
