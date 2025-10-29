/**
 * @typedef {object} GoogleAuthLike
 * @property {() => (string | null | undefined)} getIdToken Returns the cached Google ID token if one exists.
 */

/**
 * @typedef {object} AdminTokenActionContext
 * @property {string} token Token retrieved from the Google auth instance.
 * @property {() => Promise<object>} getAdminEndpoints Lazily resolves admin endpoints.
 * @property {import('./core.js').FetchFn} fetchFn Fetch implementation to use for network calls.
 * @property {(text: string) => void} showMessage Displays validation feedback to the user.
 */

/**
 * @callback AdminTokenAction
 * @param {AdminTokenActionContext} context Contextual helpers passed to the action.
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} AdminTokenActionOptions
 * @property {GoogleAuthLike} googleAuth Google auth helper that yields the current ID token.
 * @property {() => Promise<object>} getAdminEndpointsFn Lazily loads the admin endpoints.
 * @property {import('./core.js').FetchFn} fetchFn Fetch implementation for network requests.
 * @property {(text: string) => void} showMessage Renders validation feedback in the UI.
 * @property {string} missingTokenMessage Message displayed when the token is unavailable.
 * @property {AdminTokenAction} action Action to invoke once dependencies are validated.
 */

/**
 * Validate admin token action dependencies and produce a handler.
 * @param {AdminTokenActionOptions} options Dependencies and configuration for the admin action.
 * @returns {AdminTokenAction} Handler guarded by the shared validation logic.
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
