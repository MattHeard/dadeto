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
export function createAdminTokenAction(options) {
  validateAdminTokenActionOptions(options);
  return buildAdminTokenAction(options);
}

/**
 * Validate the provided dependencies required by `createAdminTokenAction`.
 * @param {AdminTokenActionOptions} options - Configuration to validate.
 * @returns {void}
 */
function validateAdminTokenActionOptions({
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage,
  action,
}) {
  ensureGoogleAuth(googleAuth);
  ensureFunctionDefined(getAdminEndpointsFn, 'getAdminEndpointsFn');
  ensureFunctionDefined(fetchFn, 'fetchFn');
  ensureFunctionDefined(showMessage, 'showMessage');
  ensureFunctionDefined(action, 'action');
}

/**
 * Ensure the Google auth helper exposes an ID token getter.
 * @param {GoogleAuthLike} googleAuth - Helper to validate.
 * @returns {void}
 */
function ensureGoogleAuth(googleAuth) {
  ensureFunctionDefined(googleAuth?.getIdToken, 'googleAuth.getIdToken');
}

/**
 * Ensure the value is a callable function.
 * @param {*} value - Candidate value to validate.
 * @param {string} name - Name used inside the error message.
 * @returns {void}
 */
function ensureFunctionDefined(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Build the admin token action once dependencies are validated.
 * @param {AdminTokenActionOptions} options - Validated dependencies for the action.
 * @returns {AdminTokenAction} Token action bound to the provided helpers.
 */
function buildAdminTokenAction({
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage,
  missingTokenMessage,
  action,
}) {
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
