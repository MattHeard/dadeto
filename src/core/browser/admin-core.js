import { ADMIN_UID } from '../commonCore.js';
import { createAdminTokenAction } from './token-action.js';
import { createGoogleSignOut, getIdToken } from '../browser/browser-core.js';

/**
 * @typedef {object} FetchRequestOptions
 * @property {string} [method] - HTTP method to use for the request.
 * @property {Record<string, string>} [headers] - Headers to include with the request.
 * @property {string | undefined} [body] - Optional request payload as a string.
 */

/**
 * @typedef {(url: string | URL, init?: FetchRequestOptions) => Promise<Response>} FetchFn
 */

/**
 * @typedef {object} ExecuteTriggerRenderOptions
 * @property {() => Promise<{ triggerRenderContentsUrl: string }>} getAdminEndpoints
 *   - Resolves admin endpoints for triggering a render.
 * @property {FetchFn} fetchFn - Fetch-like network caller.
 * @property {string} token - ID token attached to the Authorization header.
 * @property {(text: string) => void} showMessage - Callback to surface status messages.
 */

/**
 * @typedef {object} GoogleSignInOptions
 * @property {(token: string) => void} [onSignIn] - Callback invoked once a token is available.
 */

/**
 * @typedef {object} Logger
 * @property {(message?: unknown, ...optionalParams: unknown[]) => void} error - Reporter used for logging errors.
 */

/**
 * @typedef {object} GoogleAccountsClient
 * @property {(config: object) => void} initialize - Initializes the Google sign-in client.
 * @property {(element: HTMLElement, options: object) => void} renderButton - Renders a sign-in button.
 */

const DEFAULT_ADMIN_ENDPOINTS = {
  triggerRenderContentsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents',
  markVariantDirtyUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty',
  generateStatsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-generate-stats',
};

/**
 * Provide a fresh copy of the default admin endpoints to avoid shared mutation.
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}} Fresh copy of the default admin endpoints.
 */
export function getDefaultAdminEndpointsCopy() {
  return { ...DEFAULT_ADMIN_ENDPOINTS };
}

/**
 * Create a disable handler that uses the provided global scope.
 * @param {Window & typeof globalThis} globalScope - Global scope containing Google helpers.
 * @returns {() => void} Function that disables auto-select.
 */
export function createDisableAutoSelect(globalScope) {
  const disable = readDisableAutoSelect(globalScope);
  return () => {
    if (disable) {
      disable();
    }
  };
}

/**
 * Read disableAutoSelect from global scope.
 * @param {Window & typeof globalThis} globalScope Global.
 * @returns {(() => void) | null} Disable fn.
 */
function readDisableAutoSelect(globalScope) {
  const disableCandidate = getDisableAutoSelectCandidate(globalScope);
  if (isDisableAutoSelectFunction(disableCandidate)) {
    return disableCandidate;
  }

  return null;
}

/**
 * Probe the global scope for the disableAutoSelect helper.
 * @param {Window & typeof globalThis} globalScope Global scope to inspect.
 * @returns {unknown} Candidate disable helper or undefined when absent.
 */
function getDisableAutoSelectCandidate(globalScope) {
  const scope = /** @type {any} */ (globalScope);
  return getNestedProperty(
    scope,
    'google',
    'accounts',
    'id',
    'disableAutoSelect'
  );
}

/**
 * Safely read a nested property path from the provided object.
 * @param {Record<string, unknown> | undefined} source Root object.
 * @param {...string} keys Property path.
 * @returns {unknown} Value at the path or undefined when any segment is missing.
 */
function getNestedProperty(source, ...keys) {
  return keys.reduce(
    (cursor, key) => resolveNestedProperty(cursor, key),
    /** @type {any} */ (source)
  );
}

/**
 * Resolve the next segment in a nested property path when the cursor is an object.
 * @param {unknown} cursor Current traversal position.
 * @param {string} key Next key to read.
 * @returns {unknown} Value at the key when traversable, otherwise `undefined`.
 */
function resolveNestedProperty(cursor, key) {
  if (!isTraversable(cursor)) {
    return undefined;
  }

  return /** @type {{ [x: string]: unknown }} */ (cursor)[key];
}

/**
 * Determine whether the cursor can be traversed for nested properties.
 * @param {unknown} cursor Candidate traversal target.
 * @returns {boolean} True when the cursor is an object and not `null`.
 */
function isTraversable(cursor) {
  return Boolean(cursor && typeof cursor === 'object');
}

/**
 * Determine whether the candidate value is callable.
 * @param {unknown} value Candidate to evaluate.
 * @returns {value is () => void} True when the value is a function.
 */
function isDisableAutoSelectFunction(value) {
  return typeof value === 'function';
}

/**
 * Build a sign-out helper for the provided auth client and globals.
 * @param {{ signOut: () => Promise<void> | void }} authInstance - Auth client exposing `signOut`.
 * @param {typeof globalThis} globalScope - Global scope that includes `sessionStorage`.
 * @returns {() => Promise<void>} Sign-out helper that removes the cached token.
 */
export function createSignOut(authInstance, globalScope) {
  return createGoogleSignOut({
    authSignOut: authInstance.signOut.bind(authInstance),
    storage: createSessionStorageHandler(/** @type {any} */ (globalScope)),
    disableAutoSelect: createDisableAutoSelect(
      /** @type {any} */ (globalScope)
    ),
  });
}

/**
 * Create a memoized sign-out handler that lazily instantiates the helper.
 * @param {() => { signOut: () => Promise<void> | void }} getAuthFn - Getter for the auth client.
 * @param {typeof globalThis} globalScope - Global scope passed through to the helper.
 * @returns {() => () => Promise<void>} Memoized factory returning the sign-out handler.
 */
export function createSignOutHandlerFactory(getAuthFn, globalScope) {
  /** @type {(() => Promise<void>) | undefined} */
  let signOutHandler;

  return () => ensureSignOutHandler();

  /**
   * Ensure the sign-out handler has been initialized.
   * @returns {() => Promise<void>} Sign-out handler.
   */
  function ensureSignOutHandler() {
    if (!signOutHandler) {
      const auth = getAuthFn();
      signOutHandler = createSignOut(auth, globalScope);
    }

    return signOutHandler;
  }
}

/**
 * Compose the browser Google Auth helpers into a reusable module.
 * @param {object} deps Dependencies required to build the auth helpers.
 * @param {() => { signOut: () => Promise<void> | void }} deps.getAuthFn Getter for the auth client.
 * @param {Storage} deps.storage Session storage reference.
 * @param {Logger} deps.consoleObj Logger passed through to init helpers.
 * @param {Window & typeof globalThis} deps.globalScope Global scope with Google helpers.
 * @param {{ credential?: (token: string) => string }} deps.Provider Firebase provider helper exposing `credential`.
 * @param {(credentials: string) => unknown} deps.credentialFactory Credential builder invoked with the Google credential.
 * @returns {{ initGoogleSignIn: (options: object) => void, signOut: () => Promise<void> }} Public helpers for Google auth flows.
 */
/**
 * Build the function used to hand credentials to Firebase.
 * @param {(token: string) => unknown} credentialFactory - Converts raw tokens into Firebase credentials.
 * @returns {(auth: unknown, credential: unknown) => void | Promise<void>} Function that passes credentials to Firebase.
 */
export function buildSignInCredential(credentialFactory) {
  return (auth, cred) => {
    const result = credentialFactory(/** @type {string} */ (cred));
    return /** @type {void | Promise<void>} */ (result);
  };
}

/**
 * Build the Google auth helpers used by the admin surface.
 * @param {{
 *   getAuthFn: () => unknown,
 *   storage: Storage,
 *   consoleObj: { error?: (message: string) => void },
 *   globalScope: Window & typeof globalThis,
 *   Provider: { credential?: (token: string) => string },
 *   credentialFactory: (token: string) => unknown,
 * }} deps - Dependencies required to construct the auth module.
 * @returns {{
 *   initGoogleSignIn: (options?: GoogleSignInOptions) => void | Promise<void>,
 *   signOut: () => void,
 * }} Auth helpers wired to the provided dependencies.
 */
export function createGoogleAuthModule(deps) {
  const {
    getAuthFn,
    storage,
    consoleObj,
    globalScope,
    Provider,
    credentialFactory,
  } = deps;

  const getInitGoogleSignInHandler = createInitGoogleSignInHandlerFactory({
    getAuthFn,
    sessionStorageObj: storage,
    consoleObj,
    globalThisObj: /** @type {typeof globalThis} */ (globalScope),
    googleAuthProviderFn: Provider,
    signInWithCredentialFn: buildSignInCredential(credentialFactory),
  });

  const initGoogleSignIn = (/** @type {any} */ options) =>
    getInitGoogleSignInHandler()(options);

  const getSignOutHandler = createSignOutHandlerFactory(getAuthFn, globalScope);

  const signOut = () => getSignOutHandler()();

  return { initGoogleSignIn, signOut };
}

/**
 * Determine whether the provided storage and helpers yield an admin token.
 * @param {Storage} storage - Storage object holding the cached ID token.
 * @param {typeof JSON} jsonParser - JSON helper with a `parse` method.
 * @param {(value: string) => string} decodeBase64 - Base64 decoder (typically `atob`).
 * @returns {boolean} True when the stored token belongs to the admin UID.
 */
export function isAdminWithDeps(storage, jsonParser, decodeBase64) {
  const token = getIdToken(storage);
  return Boolean(token && isAdminToken(token, jsonParser, decodeBase64));
}

/**
 * Determine whether the provided token belongs to the admin UID.
 * @param {string} token JWT token string.
 * @param {typeof JSON} jsonParser JSON helper with `parse`.
 * @param {(value: string) => string} decodeBase64 Base64 decoder.
 * @returns {boolean} True when the token payload contains the admin UID.
 */
function isAdminToken(token, jsonParser, decodeBase64) {
  try {
    const payload = token.split('.')[1];
    const json = jsonParser.parse(
      decodeBase64(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return json.sub === ADMIN_UID;
  } catch {
    return false;
  }
}

/**
 * Resolve an admin endpoint using config overrides with production defaults.
 * @param {Record<string, string>} config - Configuration object containing endpoint overrides.
 * @param {'triggerRenderContentsUrl'|'markVariantDirtyUrl'|'generateStatsUrl'} key - Endpoint key to resolve.
 * @returns {string} Resolved endpoint URL.
 */
export function resolveAdminEndpoint(config, key) {
  const endpointSources = [config, DEFAULT_ADMIN_ENDPOINTS];
  const sourceWithKey = endpointSources.find(source => key in source);

  if (!sourceWithKey) {
    return '';
  }

  return /** @type {any} */ (sourceWithKey)[key];
}

/**
 * Normalize static config into admin endpoints with production fallbacks.
 * @param {Record<string, string>} config - Static config values keyed by endpoint name.
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}} Normalized admin endpoints with production fallbacks.
 */
export function mapConfigToAdminEndpoints(config) {
  return {
    triggerRenderContentsUrl: resolveAdminEndpoint(
      config,
      'triggerRenderContentsUrl'
    ),
    markVariantDirtyUrl: resolveAdminEndpoint(config, 'markVariantDirtyUrl'),
    generateStatsUrl: resolveAdminEndpoint(config, 'generateStatsUrl'),
  };
}

/**
 * Build the admin endpoints promise using a provided static config loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for the static config.
 * @returns {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>} Promise that resolves with admin endpoint URLs.
 */
export function createAdminEndpointsPromise(loadStaticConfigFn) {
  if (typeof loadStaticConfigFn !== 'function') {
    return Promise.resolve(getDefaultAdminEndpointsCopy());
  }

  return loadStaticConfigFn()
    .then(mapConfigToAdminEndpoints)
    .catch(getDefaultAdminEndpointsCopy);
}

/**
 * Create a memoized admin endpoints getter backed by a promise factory.
 * @param {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} createAdminEndpointsPromiseFn - Function that produces the admin endpoints promise.
 * @returns {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} Function returning a memoized admin endpoints promise.
 */
export function createGetAdminEndpoints(createAdminEndpointsPromiseFn) {
  /** @type {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}> | undefined} */
  let adminEndpointsPromise;

  return function getAdminEndpoints() {
    if (!adminEndpointsPromise) {
      adminEndpointsPromise = createAdminEndpointsPromiseFn();
    }

    return /** @type {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>} */ (
      adminEndpointsPromise
    );
  };
}

/**
 * Build a memoized admin endpoints getter backed by the static config loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for the static config JSON.
 * @returns {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} Function returning a memoized admin endpoints promise.
 */
export function createGetAdminEndpointsFromStaticConfig(loadStaticConfigFn) {
  return createGetAdminEndpoints(() =>
    createAdminEndpointsPromise(loadStaticConfigFn)
  );
}

/**
 * Trigger the render contents endpoint using the provided dependencies.
 * @param {() => Promise<{ triggerRenderContentsUrl: string }>} getAdminEndpointsFn - Function resolving admin endpoints.
 * @param {FetchFn} fetchFn - Fetch-like function for network calls.
 * @param {string} token - ID token attached to the Authorization header.
 * @returns {Promise<Response>} Response from the render trigger request.
 */
export async function postTriggerRenderContents(
  getAdminEndpointsFn,
  fetchFn,
  token
) {
  const { triggerRenderContentsUrl } = await getAdminEndpointsFn();
  return fetchFn(triggerRenderContentsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Report the outcome of a trigger render request using the provided messenger.
 * @param {Response} res - Response returned by the trigger render request.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @returns {Promise<void>} Resolves after the trigger render result has been surfaced.
 */
/**
 * Resolve the HTTP status for a trigger render response.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @returns {number | string} Known status code or the string "unknown" when unavailable.
 */
function resolveTriggerRenderStatus(res) {
  return extractStatus(res);
}

/**
 * Extract status from response.
 * @param {Response|null|undefined} res Response.
 * @returns {number | string} Status.
 */
function extractStatus(res) {
  const status = readStatusProperty(res);
  return status ?? 'unknown';
}

/**
 * Read status property.
 * @param {Response|null|undefined} res Response.
 * @returns {number | undefined} Status.
 */
function readStatusProperty(res) {
  if (res) {
    return res.status;
  }
  return undefined;
}

/**
 * Resolve the HTTP status text for a trigger render response.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @returns {string} Known status text or the string "unknown" when unavailable.
 */
function resolveTriggerRenderStatusText(res) {
  return extractStatusText(res);
}

/**
 * Extract status text from response.
 * @param {Response|null|undefined} res Response.
 * @returns {string} Status text.
 */
function extractStatusText(res) {
  const statusText = readStatusTextProperty(res);
  return statusText || 'unknown';
}

/**
 * Read status text property.
 * @param {Response|null|undefined} res Response.
 * @returns {string | undefined} Status text.
 */
function readStatusTextProperty(res) {
  if (res) {
    return res.statusText;
  }
  return undefined;
}

/**
 * Attempt to read a textual body from the trigger render response.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @returns {Promise<string>} Body content when readable, otherwise an empty string.
 */
async function readTriggerRenderBody(res) {
  const readText = getResponseTextReader(res);
  if (!readText) {
    return '';
  }

  return readResponseText(readText, res);
}

/**
 * Extract the text reader from a response when available.
 * @param {Response|null|undefined} res - Response that should expose a `text` method.
 * @returns {(() => Promise<string>) | null} Callable reader or null when absent.
 */
function getResponseTextReader(res) {
  if (!res) {
    return null;
  }
  return extractTextReader(res);
}

/**
 * Extract text reader.
 * @param {Response} res Response.
 * @returns {(() => Promise<string>) | null} Reader.
 */
function extractTextReader(res) {
  const reader = res.text;
  if (typeof reader !== 'function') {
    return null;
  }

  return reader;
}

/**
 * Invoke the reader bound to the provided response.
 * @param {() => Promise<string>} readText - Reader previously extracted from the response.
 * @param {Response|null|undefined} res - Response used to call the reader with the correct context.
 * @returns {Promise<string>} Promise resolving to response text or an empty string.
 */
async function readResponseText(readText, res) {
  const body = await readText.call(/** @type {Response} */ (res));
  return body || '';
}

/**
 * Format a trigger render failure message using resolved response details.
 * @param {{ status: number | string, statusText: string, body: string }} params Response details.
 * @returns {string} Human-readable failure message.
 */
function formatTriggerRenderFailureMessage({ status, statusText, body }) {
  if (!body) {
    return `Render failed: ${status} ${statusText}`;
  }

  return `Render failed: ${status} ${statusText} - ${body}`;
}

/**
 * Report a trigger render failure to the provided messenger.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @param {(text: string) => void} showMessage Callback used to surface status messages.
 * @returns {Promise<void>} Resolves after the failure has been reported.
 */
async function reportTriggerRenderFailure(res, showMessage) {
  const status = resolveTriggerRenderStatus(res);
  const statusText = resolveTriggerRenderStatusText(res);
  const body = await readTriggerRenderBody(res);

  showMessage(
    formatTriggerRenderFailureMessage({
      status,
      statusText,
      body,
    })
  );
}

/**
 * Report the outcome of a trigger render request using the provided messenger.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @param {(text: string) => void} showMessage Callback to surface status messages.
 * @returns {Promise<void>} Resolves after the trigger render result has been surfaced.
 */
export async function announceTriggerRenderResult(res, showMessage) {
  if (isResponseOk(res)) {
    showMessage('Render triggered');
    return;
  }

  await reportTriggerRenderFailure(res, showMessage);
}

/**
 * Execute the trigger render flow and report outcomes.
 * @param {ExecuteTriggerRenderOptions} options - Dependencies for the trigger render flow.
 * @returns {Promise<void>} Resolves after the trigger render flow finishes reporting.
 */
export async function executeTriggerRender({
  getAdminEndpoints,
  fetchFn,
  token,
  showMessage,
}) {
  return executeTriggerRenderCore({
    getAdminEndpoints,
    fetchFn,
    token,
    showMessage,
  }).catch(e => {
    showMessage(`Render failed: ${renderErrorMessage(e)}`);
  });
}

/**
 * Internal helper that drives the render call and reporting flow.
 * @param {{
 *   getAdminEndpoints: () => Promise<{ triggerRenderContentsUrl: string }>,
 *   fetchFn: FetchFn,
 *   token: string,
 *   showMessage: (text: string) => void,
 * }} params - Dependencies required for executing the render flow.
 * @returns {Promise<void>} Resolves when reporting the outcome completes.
 */
async function executeTriggerRenderCore({
  getAdminEndpoints,
  fetchFn,
  token,
  showMessage,
}) {
  const res = await postTriggerRenderContents(
    getAdminEndpoints,
    fetchFn,
    token
  );

  await announceTriggerRenderResult(res, showMessage);
}

/**
 * Format an error thrown during render execution.
 * @param {unknown} error - Throwable provided by the failed HTTP call.
 * @returns {string} Normalized message suitable for displaying to users.
 */
function renderErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Create a trigger render handler with the supplied dependencies.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   getAdminEndpointsFn: () => Promise<{ triggerRenderContentsUrl: string }>,
 *   fetchFn: FetchFn,
 *   showMessage: (text: string) => void,
 * }} options - Dependencies used during trigger render execution.
 * @returns {() => Promise<void>} Function that triggers render when invoked.
 */
export function createTriggerRender({
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage,
}) {
  return createAdminTokenAction({
    googleAuth,
    getAdminEndpointsFn,
    fetchFn,
    showMessage,
    missingTokenMessage: 'Render failed: missing ID token',
    action: (
      /** @type {any} */ {
        token,
        getAdminEndpoints,
        fetchFn: fetch,
        showMessage: report,
      }
    ) =>
      executeTriggerRender({
        getAdminEndpoints,
        fetchFn: fetch,
        token,
        showMessage: report,
      }),
  });
}

/**
 * Assert that the provided condition is satisfied.
 * @param {boolean} condition - Condition evaluated by the caller.
 * @param {string} message - Error message used when the assertion fails.
 * @returns {void}
 */
function requireCondition(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

/**
 * Ensure the value is a callable function.
 * @param {*} value - Value that should be a function.
 * @param {string} name - Error message target when validation fails.
 * @returns {void}
 */
function requireFunction(value, name) {
  requireCondition(typeof value === 'function', `${name} must be a function`);
}

/**
 * Ensure the value acts like a Document for DOM lookups.
 * @param {*} value - Candidate document-like object.
 * @param {string} [name] - Identifier used inside the error message.
 * @returns {void}
 */
function requireDocumentLike(value, name = 'doc') {
  requireCondition(
    isDocumentLike(value),
    `${name} must be a Document-like object`
  );
}

/**
 * Detect whether a value can perform document lookups.
 * @param {*} value - Candidate object evaluated for DOM parity.
 * @returns {boolean} True when the value exposes `getElementById`.
 */
function isDocumentLike(value) {
  return Boolean(value && typeof value.getElementById === 'function');
}

/**
 * Determine whether an element can accept DOM event listeners.
 * @param {EventTarget | null | undefined} element - Candidate element.
 * @returns {boolean} True when `addEventListener` exists on the element.
 */
function canListenToEvent(element) {
  return Boolean(element && typeof element.addEventListener === 'function');
}

/**
 * Check whether the provided auth helper exposes `signOut`.
 * @param {{ signOut?: () => Promise<void> | void } | null | undefined} googleAuth - Auth helper candidate.
 * @returns {boolean} True when a `signOut` method exists.
 */
function hasSignOutMethod(googleAuth) {
  return Boolean(googleAuth && typeof googleAuth.signOut === 'function');
}

/**
 * Verify the document exposes `querySelectorAll`.
 * @param {{ querySelectorAll?: (selector: string) => NodeList } | null | undefined} doc - Candidate document object.
 * @returns {boolean} True when `querySelectorAll` is callable.
 */
function hasQuerySelectorAll(doc) {
  return Boolean(doc && typeof doc.querySelectorAll === 'function');
}

/**
 * Determine whether a value behaves like a plain object.
 * @param {*} value - Candidate value.
 * @returns {boolean} True when the value is a non-null object.
 */
function isObject(value) {
  return Boolean(value && typeof value === 'object');
}

/**
 * Confirm the storage helper exposes `setItem`.
 * @param {{ setItem?: (key: string, value: string) => void } | null | undefined} storage - Storage helper.
 * @returns {boolean} True when a `setItem` function exists.
 */
function hasStorageSetItem(storage) {
  return Boolean(storage && typeof storage.setItem === 'function');
}

/**
 * Attach a click listener to a DOM element when present.
 * @param {Document} doc - Document used to resolve the element.
 * @param {string} elementId - ID of the target element.
 * @param {() => void | Promise<void>} listener - Handler invoked on click.
 * @returns {HTMLElement | null} The element the listener was bound to, or null when missing.
 */
function addClickListener(doc, elementId, listener) {
  return bindClickEvent(doc, elementId, listener);
}

/**
 * Attach a submit handler to the specified form element.
 * @param {Document} doc - Document used to resolve the form.
 * @param {string} elementId - ID of the form element to attach to.
 * @param {(event: Event) => void | Promise<void>} listener - Handler invoked on submit.
 * @returns {HTMLElement | null} Located form element or null when missing.
 */
function attachSubmitListener(doc, elementId, listener) {
  return bindSubmitEvent(doc, elementId, listener);
}

const bindClickEvent = createElementEventBinder('click');
const bindSubmitEvent = createElementEventBinder('submit');

/**
 * Create an element event binder for a specific DOM event.
 * @param {string} eventType - Named event type handled by the binder.
 * @returns {(doc: Document, elementId: string, listener: (event: Event) => void | Promise<void>) => HTMLElement | null} Binder that attaches the listener to the resolved element.
 */
function createElementEventBinder(eventType) {
  /**
   * Bind the listener to the element resolved from the provided document.
   * @param {Document} doc - Document used to locate the element.
   * @param {string} elementId - ID of the element to bind to.
   * @param {(() => void) | ((event: Event) => void | Promise<void>)} listener - Handler invoked when the event fires.
   * @returns {HTMLElement | null} The bound element or null when missing/cannot listen.
   */
  return function bindElementEvent(doc, elementId, listener) {
    const element = doc.getElementById(elementId);
    if (!canListenToEvent(element)) {
      return null;
    }
    const el = /** @type {EventTarget} */ (element);

    el.addEventListener(eventType, listener);
    return /** @type {HTMLElement} */ (element);
  };
}

/**
 * Attach the trigger render handler to the render button when present.
 * @param {Document} doc - Document used to locate the render button.
 * @param {() => void | Promise<void>} triggerRenderFn - Handler invoked when the button is clicked.
 * @param {string} [elementId] - ID of the button element to bind the handler to.
 * @returns {HTMLElement | null} The render button when found, otherwise null.
 */
export function bindTriggerRenderClick(
  doc,
  triggerRenderFn,
  elementId = 'renderBtn'
) {
  requireDocumentLike(doc);
  requireFunction(triggerRenderFn, 'triggerRenderFn');

  return addClickListener(doc, elementId, triggerRenderFn);
}

/**
 * Attach the trigger stats handler to the stats button when present.
 * @param {Document} doc - Document used to locate the stats button.
 * @param {() => void | Promise<void>} triggerStatsFn - Handler invoked when the button is clicked.
 * @returns {HTMLElement | null} The stats button when found, otherwise null.
 */
export function bindTriggerStatsClick(doc, triggerStatsFn) {
  if (typeof triggerStatsFn !== 'function') {
    throw new TypeError('triggerStatsFn must be a function');
  }

  return bindTriggerRenderClick(doc, triggerStatsFn, 'statsBtn');
}

/**
 * Attach the regenerate variant handler to the form when present.
 * @param {Document} doc - Document used to locate the regenerate variant form.
 * @param {(event: Event) => void | Promise<void>} regenerateVariantFn - Handler invoked when the form is submitted.
 * @returns {HTMLElement | null} The regenerate form when found, otherwise null.
 */
export function bindRegenerateVariantSubmit(doc, regenerateVariantFn) {
  requireDocumentLike(doc);
  requireFunction(regenerateVariantFn, 'regenerateVariantFn');

  return attachSubmitListener(doc, 'regenForm', regenerateVariantFn);
}

/**
 * Create a function that wires sign-out links to the provided sign-out handler.
 * @param {Document} doc - Document used to locate sign-out links.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Google auth helper with a `signOut` method.
 * @returns {() => void} Function that attaches click handlers to sign-out links.
 */
export function createWireSignOut(doc, googleAuth) {
  ensureSignOutDoc(doc);
  ensureSignOutAuth(googleAuth);

  return function wireSignOut() {
    attachSignOutLinks(doc, googleAuth);
  };
}

/**
 * Guard that ensures the Google auth helper exposes a sign-out method.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Auth helper used to sign the admin out.
 * @returns {void}
 */
function ensureSignOutAuth(googleAuth) {
  if (!hasSignOutMethod(googleAuth)) {
    throw new TypeError('googleAuth must provide a signOut function');
  }
}

/**
 * Ensure the provided document exposes `querySelectorAll` before wiring handlers.
 * @param {{ querySelectorAll?: (selector: string) => NodeList }} doc - Document-like object used during binding.
 * @returns {void}
 */
function ensureSignOutDoc(doc) {
  if (!hasQuerySelectorAll(doc)) {
    throw new TypeError('doc must be a Document-like object');
  }
}

/**
 * Attach a click listener to a single sign-out link.
 * @param {HTMLElement | null | undefined} link - Element that should trigger sign-out when clicked.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Auth helper used by the handler.
 * @returns {void}
 */
function attachSignOutLink(link, googleAuth) {
  if (!canListenToEvent(link)) {
    return;
  }

  const el = /** @type {EventTarget} */ (link);
  el.addEventListener('click', createSignOutClickHandler(googleAuth));
}

/**
 * Attach sign-out listeners to every link with the `#signoutLink` selector.
 * @param {Document} doc - Document used to query sign-out links.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Auth helper passed to each listener.
 * @returns {void}
 */
function attachSignOutLinks(doc, googleAuth) {
  doc
    .querySelectorAll('#signoutLink')
    .forEach(link =>
      attachSignOutLink(/** @type {HTMLElement} */ (link), googleAuth)
    );
}

/**
 * Build a click handler that prevents the default action and calls signOut.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Auth helper whose signOut is invoked.
 * @returns {(event: Event) => Promise<void>} Click handler that triggers sign-out.
 */
function createSignOutClickHandler(googleAuth) {
  return async event => {
    preventDefaultEvent(event);
    await googleAuth.signOut();
  };
}

/**
 * Ensure the provided value is a callable function.
 * @param {unknown} value - Value that should be a function.
 * @param {string} message - Error message thrown when validation fails.
 * @returns {void}
 */
function assertFunction(value, message) {
  if (typeof value !== 'function') {
    throw new TypeError(message);
  }
}

/**
 * Ensure the provided value is a non-null object.
 * @param {*} value - Candidate value that should behave like an object.
 * @param {string} message - Message used for the thrown error when validation fails.
 * @returns {void}
 */
function ensureObject(value, message) {
  if (!isObject(value)) {
    throw new TypeError(message);
  }
}

/**
 * Ensure the provided storage exposes a `setItem` method.
 * @param {{ setItem?: (key: string, value: string) => void } | null | undefined} storage - Storage-like interface.
 * @returns {void}
 */
function ensureStorage(storage) {
  if (!hasStorageSetItem(storage)) {
    throw new TypeError('storage must provide a setItem function');
  }
}

/**
 * Ensure Google sign-in dependencies expose the expected interfaces.
 * @param {{
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void,
 *   auth?: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage?: { setItem?: (key: string, value: string) => void },
 *   matchMedia: (query: string) => { matches: boolean },
 *   querySelectorAll: (selector: string) => NodeList,
 * }} deps - Dependencies to validate.
 * @returns {void} - Throws when any dependency is invalid.
 */
function validateGoogleSignInDeps({
  credentialFactory,
  signInWithCredential,
  auth,
  storage,
  matchMedia,
  querySelectorAll,
}) {
  assertFunction(credentialFactory, 'credentialFactory must be a function');
  assertFunction(
    signInWithCredential,
    'signInWithCredential must be a function'
  );
  ensureObject(auth, 'auth must be provided');
  ensureStorage(storage);
  assertFunction(matchMedia, 'matchMedia must be a function');
  assertFunction(querySelectorAll, 'querySelectorAll must be a function');
}

/**
 * Validate and normalize dependencies for Google sign-in initialization.
 * @param {{
 *   googleAccountsId?: GoogleAccountsClient | (() => GoogleAccountsClient | undefined),
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   matchMedia: (query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void },
 *   querySelectorAll: (selector: string) => NodeList,
 *   logger?: { error?: (message: string) => void },
 * }} deps - Raw dependency bag.
 * @returns {NormalizedGoogleSignInDeps} Normalized dependencies with required helpers.
 */
function normalizeGoogleSignInDeps(deps) {
  const normalizedDeps = summarizeGoogleSignInDeps(deps);

  validateGoogleSignInDeps(/** @type {any} */ (normalizedDeps));

  return /** @type {NormalizedGoogleSignInDeps} */ (normalizedDeps);
}

/**
 * @typedef {object} GoogleSignInDeps
 * @property {GoogleAccountsClient | (() => GoogleAccountsClient | undefined)} [googleAccountsId] - Google Identity client or resolver.
 * @property {(credential: string) => unknown} [credentialFactory] - Factory for creating Firebase credentials.
 * @property {(auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void} [signInWithCredential] - Helper to sign in with a credential.
 * @property {{ currentUser?: { getIdToken?: () => Promise<string> } }} [auth] - Firebase auth instance.
 * @property {{ setItem: (key: string, value: string) => void }} [storage] - Storage implementation for persisting tokens.
 * @property {(query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void }} [matchMedia] - Media query matcher for theme detection.
 * @property {(selector: string) => NodeList} [querySelectorAll] - DOM query helper for locating button targets.
 * @property {{ error?: (message: string) => void }} [logger] - Optional logger for reporting errors.
 */

/**
 * @typedef {object} SummarizedGoogleSignInDeps
 * @property {GoogleAccountsClient | (() => GoogleAccountsClient | undefined)} [googleAccountsId] - Google Identity client or resolver.
 * @property {(credential: string) => unknown} [credentialFactory] - Factory for creating Firebase credentials.
 * @property {(auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void} [signInWithCredential] - Helper to sign in with a credential.
 * @property {{ currentUser?: { getIdToken?: () => Promise<string> } }} [auth] - Firebase auth instance.
 * @property {{ setItem: (key: string, value: string) => void }} [storage] - Storage implementation for persisting tokens.
 * @property {(query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void }} [matchMedia] - Media query matcher for theme detection.
 * @property {(selector: string) => NodeList} [querySelectorAll] - DOM query helper for locating button targets.
 * @property {{ error?: (message: string) => void }} logger - Logger for reporting errors.
 * @property {{ error?: (message: string) => void }} safeLogger - Safely initialized logger.
 * @property {() => GoogleAccountsClient | undefined} resolveGoogleAccountsId - Resolver for the Google Identity client.
 */

/**
 * @typedef {object} NormalizedGoogleSignInDeps
 * @property {() => GoogleAccountsClient | undefined} resolveGoogleAccountsId - Resolver for the Google Identity client.
 * @property {(credential: string) => unknown} credentialFactory - Factory for creating Firebase credentials.
 * @property {(auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void} signInWithCredential - Helper to sign in with a credential.
 * @property {{ currentUser?: { getIdToken?: () => Promise<string> } }} auth - Firebase auth instance.
 * @property {{ setItem: (key: string, value: string) => void }} storage - Storage implementation for persisting tokens.
 * @property {(query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void }} matchMedia - Media query matcher for theme detection.
 * @property {(selector: string) => NodeList} querySelectorAll - DOM query helper for locating button targets.
 * @property {{ error?: (message: string) => void }} safeLogger - Safely initialized logger.
 */

/**
 * Normalize the raw Google sign-in inputs without validation.
 * @param {GoogleSignInDeps | undefined} deps - Raw dependency bag.
 * @returns {SummarizedGoogleSignInDeps} Normalized dependencies with resolver helpers.
 */
function summarizeGoogleSignInDeps(deps) {
  const normalized = buildNormalizedGoogleSignInDeps(deps);

  normalized.safeLogger = resolveLogger(normalized.logger);
  normalized.resolveGoogleAccountsId = resolveGoogleAccounts(
    normalized.googleAccountsId
  );

  return normalized;
}

/**
 * Prepare the raw dependency values with defaults but without validation.
 * @param {GoogleSignInDeps | undefined} deps - Raw dependency bag.
 * @returns {SummarizedGoogleSignInDeps} Normalized dependency bag with defaults applied.
 */
function buildNormalizedGoogleSignInDeps(deps) {
  const source = deps ?? {};
  /** @type {SummarizedGoogleSignInDeps} */
  const normalized = {
    googleAccountsId: source.googleAccountsId,
    credentialFactory: source.credentialFactory,
    signInWithCredential: source.signInWithCredential,
    auth: source.auth,
    storage: source.storage,
    matchMedia: source.matchMedia,
    querySelectorAll: source.querySelectorAll,
    logger: source.logger,
    safeLogger: { error: () => {} },
  };

  return ensureLogger(normalized);
}

/**
 * Ensure logger exists.
 * @param {SummarizedGoogleSignInDeps} deps Deps.
 * @returns {SummarizedGoogleSignInDeps} Deps with logger.
 */
function ensureLogger(deps) {
  applyDefaultLogger(deps);
  return deps;
}

/**
 * Assign the default console logger when no logger has been provided.
 * @param {SummarizedGoogleSignInDeps} deps Dependency bag to update.
 * @returns {void}
 */
function applyDefaultLogger(deps) {
  if (!hasLogger(deps.logger)) {
    deps.logger = console;
  }
}

/**
 * Determine whether a logger instance is already configured.
 * @param {object | null | undefined} logger Candidate logger.
 * @returns {boolean} True when a logger value exists.
 */
function hasLogger(logger) {
  return !isMissingLogger(logger);
}

/**
 * Determine whether the logger value is missing.
 * @param {unknown} logger Candidate logger reference.
 * @returns {boolean} True when the logger is undefined or null.
 */
function isMissingLogger(logger) {
  return logger === undefined || logger === null;
}

/**
 * Resolve the accounts ID helper into a callable resolver.
 * @param {GoogleAccountsClient | (() => GoogleAccountsClient | undefined) | undefined} googleAccountsId - Optional helper that provides the Google Identity client.
 * @returns {() => GoogleAccountsClient | undefined} Resolver that always returns the accounts client.
 */
function resolveGoogleAccounts(googleAccountsId) {
  if (typeof googleAccountsId === 'function') {
    return googleAccountsId;
  }
  return () => googleAccountsId;
}

/**
 * Ensure we always have a logger that can report errors.
 * @param {{ error?: (message: string) => void } | undefined} logger - Optional logger provided by the caller.
 * @returns {{ error?: (message: string) => void }} Logger that safely exposes `error`.
 */
function resolveLogger(logger) {
  if (hasLoggerError(logger)) {
    return /** @type {{ error: (message: string) => void }} */ (logger);
  }
  return console;
}

/**
 * Determine whether the Google Identity client exposes the expected methods.
 * @param {unknown} accountsId - Candidate Google Identity client.
 * @returns {boolean} True when the client provides initialize and renderButton.
 */
function hasRequiredGoogleIdentityMethods(accountsId) {
  const client = /** @type {GoogleAccountsClient} */ (accountsId);
  return hasInitializeMethod(client) && hasRenderButtonMethod(client);
}

/**
 * Report a missing Google Identity script to the provided logger.
 * @param {{ error?: (message: string) => void }} logger - Logger used for reporting.
 * @returns {void}
 */
function reportMissingGoogleIdentity(logger) {
  const safe = resolveLogger(logger);
  if (typeof safe.error === 'function') {
    safe.error('Google Identity script missing');
  }
}

/**
 * Determine whether the provided logger exposes an `error` method.
 * @param {{ error?: (message: string) => void } | undefined} logger - Logger candidate.
 * @returns {boolean} True when an `error` function is available.
 */
function hasLoggerError(logger) {
  return Boolean(logger && typeof logger.error === 'function');
}

/**
 * Check whether the Google Identity client exposes `initialize`.
 * @param {unknown} accountsId - Candidate Google Identity client.
 * @returns {boolean} True when `initialize` exists.
 */
function hasInitializeMethod(accountsId) {
  const client = /** @type {GoogleAccountsClient} */ (accountsId);
  return Boolean(client && typeof client.initialize === 'function');
}

/**
 * Check whether the Google Identity client exposes `renderButton`.
 * @param {unknown} accountsId - Candidate Google Identity client.
 * @returns {boolean} True when `renderButton` exists.
 */
function hasRenderButtonMethod(accountsId) {
  const client = /** @type {GoogleAccountsClient} */ (accountsId);
  return Boolean(client && typeof client.renderButton === 'function');
}

/**
 * Complete the Firebase sign-in flow using a Google credential.
 * @param {{ credential: string }} param0 - Payload containing the Google credential.
 * @param {{
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   onSignIn?: (token: string) => void,
 * }} context - Collaborators required to complete the sign-in.
 * @returns {Promise<void>} Resolves once the credential has been processed.
 */
async function handleCredentialSignIn(
  { credential },
  { credentialFactory, signInWithCredential, auth, storage, onSignIn }
) {
  const firebaseCredential = credentialFactory(credential);
  await signInWithCredential(auth, firebaseCredential);

  const currentUser = auth.currentUser;
  const getIdToken = resolveGetIdToken(currentUser);
  const idToken = await getIdToken();
  storage.setItem('id_token', idToken);
  onSignIn?.(idToken);
}

/**
 * Build a getter for the current user's `getIdToken` method.
 * @param {{ getIdToken?: (() => Promise<string>) | (() => string | null | undefined) } | null | undefined} currentUser - Auth user object.
 * @returns {() => Promise<string>} Function returning a promised token.
 */
/**
 * Validate get id token.
 * @param {Function} getter Getter.
 * @returns {void}
 */
function validateGetIdToken(getter) {
  if (typeof getter !== 'function') {
    throw new TypeError('auth.currentUser.getIdToken must be a function');
  }
}

/**
 * Resolve a safe getter for the current user's ID token method.
 * @param {{
 *   getIdToken?: (() => Promise<string> | string | null | undefined) | undefined,
 * } | null | undefined} currentUser - Auth user object that may expose `getIdToken`.
 * @returns {() => Promise<string>} Function that returns a promised ID token.
 */
function resolveGetIdToken(currentUser) {
  const getter = currentUser?.getIdToken;
  validateGetIdToken(getter);
  return () => /** @type {() => Promise<string>} */ (getter).call(currentUser);
}

/**
 * Render Google sign-in buttons with a theme derived from the media query.
 * @param {GoogleAccountsClient} accountsId - Google Identity client used to render buttons.
 * @param {(selector: string) => NodeList} querySelectorAll - DOM query helper.
 * @param {{ matches: boolean, addEventListener?: (type: string, listener: () => void) => void } | undefined} mediaQueryList - Media query list controlling the theme.
 * @returns {void}
 */
function renderSignInButtons(accountsId, querySelectorAll, mediaQueryList) {
  const elements = getSignInButtonElements(querySelectorAll);
  const theme = resolveSignInTheme(mediaQueryList);

  elements.forEach(el => renderSignInButton(el, accountsId, theme));
}

/**
 * Collect available sign-in button elements via the DOM helper.
 * @param {(selector: string) => NodeList} querySelectorAll - DOM helper for locating nodes.
 * @returns {HTMLElement[]} Array of sign-in button elements.
 */
function getSignInButtonElements(querySelectorAll) {
  return /** @type {HTMLElement[]} */ (
    Array.from(querySelectorAll('#signinButton') ?? [])
  );
}

/**
 * Check if dark mode.
 * @param {{ matches?: boolean } | undefined} mediaQueryList Media query list capturing dark-mode preference.
 * @returns {boolean} True when dark mode is preferred.
 */
function isDarkMode(mediaQueryList) {
  return Boolean(mediaQueryList?.matches);
}

/**
 * Resolve the Google sign-in button theme from the current media query.
 * @param {{ matches?: boolean } | undefined} mediaQueryList Media query list that may indicate dark mode.
 * @returns {'filled_blue' | 'filled_black'} Theme name used by the button renderer.
 */
function resolveSignInTheme(mediaQueryList) {
  if (isDarkMode(mediaQueryList)) {
    return 'filled_black';
  }

  return 'filled_blue';
}

/**
 * Render a single Google sign-in button element.
 * @param {HTMLElement | null} element - DOM element targeted for rendering.
 * @param {GoogleAccountsClient} accountsId - Google Identity client exposing `renderButton`.
 * @param {'filled_blue' | 'filled_black'} theme - Theme applied to the rendered button.
 * @returns {void}
 */
function renderSignInButton(element, accountsId, theme) {
  if (!element) {
    return;
  }

  element.innerHTML = '';
  accountsId.renderButton(element, {
    theme,
    size: 'large',
    text: 'signin_with',
  });
}

/**
 * Create an initializer for the Google sign-in button with injected dependencies.
 * @param {{
 *   googleAccountsId?: GoogleAccountsClient | (() => GoogleAccountsClient | undefined),
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   matchMedia: (query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void },
 *   querySelectorAll: (selector: string) => NodeList,
 *   logger?: { error?: (message: string) => void },
 * }} deps - Collaborators required to configure the Google sign-in button.
 * @returns {(options?: GoogleSignInOptions) => Promise<void> | void} Initialized sign-in function.
 */
export function createInitGoogleSignIn(deps) {
  const normalizedDeps = normalizeGoogleSignInDeps(deps);

  return function initGoogleSignIn({ onSignIn } = {}) {
    return initGoogleSignInCore(normalizedDeps, onSignIn);
  };
}

/**
 * Wire the Google Identity button renderer with the normalized dependencies.
 * @param {{
 *   resolveGoogleAccountsId: () => GoogleAccountsClient | undefined,
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (
 *     auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *     credential: unknown
 *   ) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   matchMedia: (
 *     query: string
 *   ) => { matches: boolean; addEventListener?: (type: string, listener: () => void) => void },
 *   querySelectorAll: (selector: string) => NodeList,
 *   safeLogger: { error?: (message: string) => void },
 * }} deps - Normalized Google sign-in dependencies.
 * @param {(token: string) => void | undefined} [onSignIn] - Optional callback invoked with the obtained ID token.
 * @returns {void}
 */
function initGoogleSignInCore(deps, onSignIn) {
  const {
    resolveGoogleAccountsId,
    credentialFactory,
    signInWithCredential,
    auth,
    storage,
    matchMedia,
    querySelectorAll,
    safeLogger,
  } = deps;

  const accountsId = resolveGoogleAccountsId();

  if (ensureGoogleIdentityAvailable(accountsId, safeLogger)) {
    initializeGoogleSignIn(/** @type {GoogleAccountsClient} */ (accountsId), {
      credentialFactory,
      signInWithCredential,
      auth,
      storage,
      onSignIn,
    });

    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)');
    setupSignInButtonRenderer(
      /** @type {GoogleAccountsClient} */ (accountsId),
      querySelectorAll,
      mediaQueryList
    );
  }
}

/**
 * Prepare the Google Identity client with credentials and callbacks.
 * @param {GoogleAccountsClient} accountsId - Google Identity client exposing `initialize`.
 * @param {{
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (
 *     auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *     credential: unknown
 *   ) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   onSignIn?: (token: string) => void,
 * }} options - Dependencies for acquiring and storing the ID token.
 * @returns {void}
 */
function initializeGoogleSignIn(accountsId, options) {
  accountsId.initialize({
    ['client_id']:
      '848377461162-rv51umkquokgoq0hsnp1g0nbmmrv7kl0.apps.googleusercontent.com',
    callback: (/** @type {any} */ cred) =>
      handleCredentialSignIn(cred, options),
    ['ux_mode']: 'popup',
  });
}

/**
 * Create a trigger stats handler with the supplied dependencies.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   getAdminEndpointsFn: () => Promise<{ generateStatsUrl: string }>,
 *   fetchFn: FetchFn,
 *   showMessage: (text: string) => void,
 * }} options - Dependencies used during stats generation.
 * @returns {() => Promise<void>} Function that triggers stats generation when invoked.
 */
export function createTriggerStats({
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage,
}) {
  return createAdminTokenAction({
    googleAuth,
    getAdminEndpointsFn,
    fetchFn,
    showMessage,
    missingTokenMessage: 'Stats generation failed',
    action: async ({
      token,
      getAdminEndpoints,
      fetchFn: fetch,
      showMessage: report,
    }) => {
      try {
        const endpoints = /** @type {{ generateStatsUrl: string }} */ (
          await getAdminEndpoints()
        );
        await fetch(endpoints.generateStatsUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        report('Stats generated');
      } catch {
        report('Stats generation failed');
      }
    },
  });
}

/**
 * Create a regenerate variant handler with the supplied dependencies.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   doc: Document,
 *   showMessage: (text: string) => void,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   fetchFn: FetchFn,
 * }} options - Dependencies for the regenerate workflow.
 * @returns {(event: Event) => Promise<void>} Function that triggers variant regeneration when invoked.
 */
export function createRegenerateVariant(options) {
  validateRegenerateVariantDeps(options);
  return createRegenerateVariantHandler(options);
}

/**
 * Check whether the provided auth helper exposes `getIdToken`.
 * @param {{ getIdToken?: () => string | null | undefined } | undefined | null} googleAuth - Candidate auth helper.
 * @returns {boolean} True when `getIdToken` is callable.
 */
function hasGetIdToken(googleAuth) {
  return Boolean(googleAuth && typeof googleAuth.getIdToken === 'function');
}

/**
 * Validate the Google auth helper exposes `getIdToken`.
 * @param {{ getIdToken?: () => string | null | undefined } | undefined | null} googleAuth - Auth helper provided by Google.
 * @returns {void}
 */
function ensureGoogleAuth(googleAuth) {
  if (!isValidAuth(googleAuth)) {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
}

/**
 * Check if auth is valid.
 * @param {any} googleAuth Auth.
 * @returns {boolean} True if valid.
 */
function isValidAuth(googleAuth) {
  if (!googleAuth) {
    return false;
  }
  return hasGetIdToken(googleAuth);
}

/**
 * Validate dependencies before producing the regenerate variant handler.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   doc: Document,
 *   showMessage: (text: string) => void,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   fetchFn: FetchFn,
 * }} deps - Dependencies required for regenerating a variant.
 * @returns {void}
 */
function validateRegenerateVariantDeps({
  googleAuth,
  doc,
  showMessage,
  getAdminEndpointsFn,
  fetchFn,
}) {
  ensureGoogleAuth(googleAuth);
  requireDocumentLike(doc);
  requireFunction(showMessage, 'showMessage');
  requireFunction(getAdminEndpointsFn, 'getAdminEndpointsFn');
  requireFunction(fetchFn, 'fetchFn');
}

/**
 * Build the actual regenerate variant handler after validation.
 * @param {{
 *   googleAuth: { getIdToken: () => string | null | undefined },
 *   doc: Document,
 *   showMessage: (text: string) => void,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   fetchFn: FetchFn,
 * }} options - Dependencies needed to trigger regeneration.
 * @returns {(event: Event) => Promise<void>} Handler that reads the input, builds the payload, and submits the request.
 */
function createRegenerateVariantHandler({
  googleAuth,
  doc,
  showMessage,
  getAdminEndpointsFn,
  fetchFn,
}) {
  return async function regenerateVariant(event) {
    preventDefaultEvent(event);

    const payload = resolveRegenerationPayload(doc, showMessage, googleAuth);
    await performRegenerationWhenReady(payload, {
      fetchFn,
      getAdminEndpointsFn,
      showMessage,
    });
  };
}

/**
 * Parse the regenerate form input and return structured page/variant data.
 * @param {Document} doc - Document containing the regenerate input.
 * @param {(text: string) => void} showMessage - Reporter used when the input is invalid.
 * @returns {{page: number, variant: string} | null} Parsed page/variant info when valid.
 */
function resolveValidPageVariant(doc, showMessage) {
  const pageVariant = getPageVariantFromDoc(doc);
  if (!pageVariant) {
    showMessage('Invalid format');
    return null;
  }

  return pageVariant;
}

/**
 * Resolve the ID token and page/variant pair for regeneration.
 * @param {Document} doc - Document holding the regeneration input.
 * @param {(text: string) => void} showMessage - Reporter for invalid input.
 * @param {{ getIdToken: () => string | null | undefined }} googleAuth - Auth helper that supplies the token.
 * @returns {{ token: string, pageVariant: { page: number, variant: string } } | null} Structured payload or null when a dependency is missing.
 */
/**
 * Get token safely.
 * @param {object} googleAuth Auth.
 * @returns {string | null} Token.
 */
function getTokenSafely(googleAuth) {
  const auth = /** @type {{ getIdToken: () => string | null | undefined }} */ (
    googleAuth
  );
  return auth.getIdToken() || null;
}

/**
 * Assemble the token and page/variant pair when both pieces are available.
 * @param {Document} doc - Document containing the regeneration form.
 * @param {(text: string) => void} showMessage - Reporter for validation errors.
 * @param {{ getIdToken: () => string | null | undefined }} googleAuth - Auth helper that supplies the ID token.
 * @returns {{ token: string, pageVariant: { page: number, variant: string } } | null} Payload when ready, otherwise null.
 */
function resolveRegenerationPayload(doc, showMessage, googleAuth) {
  const token = getTokenSafely(googleAuth);
  if (!token) {
    return null;
  }

  return resolvePageVariantPayload(doc, showMessage, token);
}

/**
 * Create the payload for regeneration when the document input parses successfully.
 * @param {Document} doc - Document containing the regeneration form.
 * @param {(text: string) => void} showMessage - Reporter when the input is invalid.
 * @param {string} token - ID token resolved from Google auth.
 * @returns {{ token: string, pageVariant: { page: number, variant: string } } | null}
 *   Structured payload with the page/variant pair and token, or null when parsing fails.
 */
function resolvePageVariantPayload(doc, showMessage, token) {
  const pageVariant = resolveValidPageVariant(doc, showMessage);
  if (pageVariant) {
    return { token, pageVariant };
  }
  return null;
}

/**
 * Safely prevent the default action for the provided event.
 * @param {{ preventDefault?: () => void } | null | undefined} event - Event-like object.
 * @returns {void}
 */
/**
 * Check if event can default.
 * @param {object} event Event.
 * @returns {boolean} True if can default.
 */
function canPreventDefault(event) {
  const e = /** @type {{ preventDefault?: () => void }} */ (event);
  return Boolean(e && typeof e.preventDefault === 'function');
}

/**
 * Prevent the default action when the event supports it.
 * @param {{ preventDefault?: () => void } | null | undefined} event - Event-like object supplied by the DOM.
 * @returns {void}
 */
function preventDefaultEvent(event) {
  if (canPreventDefault(event)) {
    /** @type {Event} */ (event).preventDefault();
  }
}

/**
 * Trigger regeneration once the payload is available.
 * @param {{ token: string, pageVariant: { page: number, variant: string } } | null} payload - Payload with token and route data.
 * @param {{
 *   fetchFn: FetchFn,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   showMessage: (text: string) => void,
 * }} deps - Dependencies required to execute the regeneration request.
 * @returns {Promise<void>}
 */
async function performRegenerationWhenReady(payload, deps) {
  if (!payload) {
    return;
  }

  await performRegeneration({
    ...deps,
    token: payload.token,
    pageVariant: payload.pageVariant,
  });
}

/**
 * Read and parse the page/variant input from the regeneration form.
 * @param {Document} doc - Document containing the regenerate input.
 * @returns {{page: number, variant: string} | null} Parsed page/variant info or null when invalid.
 */
function getPageVariantFromDoc(doc) {
  const input = /** @type {HTMLInputElement | null} */ (
    doc.getElementById('regenInput')
  );
  return parsePageVariantInput(input);
}

/**
 * Submit the regenerate variant request and report the result.
 * @param {{
 *   fetchFn: FetchFn,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   token: string,
 *   pageVariant: { page: number, variant: string },
 *   showMessage: (text: string) => void,
 * }} options - Dependencies and payload for the regeneration flow.
 * @returns {Promise<void>} Resolves once the request has been attempted.
 */
async function performRegeneration({
  fetchFn,
  getAdminEndpointsFn,
  token,
  pageVariant,
  showMessage,
}) {
  try {
    await sendRegenerateVariantRequest({
      fetchFn,
      getAdminEndpointsFn,
      token,
      pageVariant,
    });
    showMessage('Regeneration triggered');
  } catch {
    showMessage('Regeneration failed');
  }
}

/**
 * Parse the regenerate input element into a page and variant pair.
 * @param {HTMLInputElement | null | undefined} inputElement - Input element containing the page and variant value.
 * @returns {{page: number, variant: string} | null} Parsed page and variant when the input is valid; otherwise null.
 */
function parsePageVariantInput(inputElement) {
  const trimmedValue = getTrimmedInputValue(inputElement);
  if (!trimmedValue) {
    return null;
  }

  return parsePageVariantValue(trimmedValue);
}

/**
 * Read and trim the value from the regenerate input element.
 * @param {HTMLInputElement | null | undefined} inputElement - Potential regenerate input element.
 * @returns {string} Trimmed value or an empty string when unavailable.
 */
/**
 * Get value from input.
 * @param {object} inputElement Input.
 * @returns {string} Value.
 */
function getValueFromInput(inputElement) {
  const el = /** @type {HTMLInputElement} */ (inputElement);
  const { value } = el;
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

/**
 * Retrieve and trim the value from the regenerate input element.
 * @param {HTMLInputElement | null | undefined} inputElement - Element that may hold the regeneration string.
 * @returns {string} Trimmed value or an empty string when input is missing.
 */
function getTrimmedInputValue(inputElement) {
  if (!inputElement) {
    return '';
  }

  return getValueFromInput(inputElement).trim();
}

/**
 * Convert a raw regenerate input string into a page and variant pair.
 * @param {string} value - Raw input string in the "123abc" format.
 * @returns {{page: number, variant: string} | null} Parsed page and variant when the value matches the expected format.
 */
function parsePageVariantValue(value) {
  const match = value.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) {
    return null;
  }

  return { page: Number(match[1]), variant: match[2] };
}

/**
 * Determine whether the response indicates a successful fetch.
 * @param {Response | null | undefined} res - Response returned by the request.
 * @returns {boolean} True when the response exists and has an `ok` status.
 */
function isResponseOk(res) {
  return Boolean(res && res.ok);
}

/**
 * Ensure the response from the regeneration request succeeded.
 * @param {Response | null | undefined} res - Response returned from the fetch call.
 * @returns {void}
 */
function ensureResponseOk(res) {
  if (!isResponseOk(res)) {
    throw new Error('fail');
  }
}

/**
 * Submit a regenerate request to the admin endpoint.
 * @param {{
 *   fetchFn: FetchFn,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   token: string,
 *   pageVariant: { page: number, variant: string },
 * }} options - Dependencies and payload for the regenerate request.
 * @returns {Promise<void>}
 */
async function sendRegenerateVariantRequest({
  fetchFn,
  getAdminEndpointsFn,
  token,
  pageVariant,
}) {
  const { markVariantDirtyUrl } = await getAdminEndpointsFn();
  const res = await fetchFn(markVariantDirtyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pageVariant),
  });

  ensureResponseOk(res);
}

/**
 * Locate the status paragraph within the provided document.
 * @param {Document} doc - Document to query for the status element.
 * @returns {HTMLElement | null} Paragraph element used for status messages.
 */
export function getStatusParagraph(doc) {
  return doc.getElementById('renderStatus');
}

/**
 * Create a status message reporter bound to the provided document lookup.
 * @param {(doc: Document) => HTMLElement | null} getStatusParagraphFn - Resolves the status element.
 * @param {Document} doc - Document used to locate the status element.
 * @returns {(text: string) => void} Function that renders status messages.
 */
export function createShowMessage(getStatusParagraphFn, doc) {
  const statusParagraph = resolveStatusParagraph(getStatusParagraphFn, doc);
  return text => renderStatusParagraph(statusParagraph, text);
}

/**
 * Validate deps and resolve the paragraph element used for statuses.
 * @param {(doc: Document) => HTMLElement | null} getStatusParagraphFn - Provides the paragraph element from a document.
 * @param {Document} doc - Document used to resolve the element.
 * @returns {HTMLElement | null} Bound paragraph element for status messages.
 */
function resolveStatusParagraph(getStatusParagraphFn, doc) {
  requireFunction(getStatusParagraphFn, 'getStatusParagraphFn');
  requireDocumentLike(doc);
  return getStatusParagraphFn(doc);
}

/**
 * Render text into the provided status paragraph.
 * @param {HTMLElement | null} statusParagraph - Element used to display admin messages.
 * @param {string} text - Message text to show.
 * @returns {void}
 */
function renderStatusParagraph(statusParagraph, text) {
  if (!statusParagraph) {
    return;
  }

  statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
}

/**
 * Initialize the admin interface by wiring event handlers and auth listeners.
 * @param {{
 *   googleAuthModule: {
 *     initGoogleSignIn: () => void,
 *     getIdToken: () => string | null | undefined,
 *     signOut: () => Promise<void> | void,
 *   },
 *   loadStaticConfigFn: () => Promise<Record<string, string>>,
 *   getAuthFn: () => unknown,
 *   onAuthStateChangedFn: (auth: unknown, callback: () => void) => void,
 *   doc: Document,
 *   fetchFn: FetchFn,
 * }} options - Dependencies required for admin initialization.
 * @returns {void}
 */
export function initAdmin({
  googleAuthModule,
  loadStaticConfigFn,
  getAuthFn,
  onAuthStateChangedFn,
  doc,
  fetchFn,
}) {
  validateInitAdminDeps({
    googleAuthModule,
    getAuthFn,
    onAuthStateChangedFn,
    doc,
    fetchFn,
  });

  const getAdminEndpoints =
    createGetAdminEndpointsFromStaticConfig(loadStaticConfigFn);
  const showMessage = createShowMessage(getStatusParagraph, doc);

  const checkAccess = createCheckAccess(getAuthFn, doc);

  const triggerRender = createTriggerRender({
    googleAuth: googleAuthModule,
    getAdminEndpointsFn: getAdminEndpoints,
    fetchFn,
    showMessage,
  });

  const triggerStats = createTriggerStats({
    googleAuth: googleAuthModule,
    getAdminEndpointsFn: getAdminEndpoints,
    fetchFn,
    showMessage,
  });

  const regenerateVariant = createRegenerateVariant({
    googleAuth: googleAuthModule,
    doc,
    showMessage,
    getAdminEndpointsFn: getAdminEndpoints,
    fetchFn,
  });

  bindTriggerRenderClick(doc, triggerRender);
  bindTriggerStatsClick(doc, triggerStats);
  bindRegenerateVariantSubmit(doc, regenerateVariant);

  createWireSignOut(doc, googleAuthModule)();
  onAuthStateChangedFn(getAuthFn(), checkAccess);
  if (typeof googleAuthModule.initGoogleSignIn === 'function') {
    googleAuthModule.initGoogleSignIn();
  } else {
    throw new TypeError(
      'googleAuthModule must provide an initGoogleSignIn function'
    );
  }
}

/**
 * Validate core admin initialization helpers before wiring event listeners.
 * @param {{
 *   googleAuthModule: {
 *     initGoogleSignIn?: () => void,
 *     getIdToken: () => string | null | undefined,
 *     signOut: () => Promise<void> | void,
 *   },
 *   getAuthFn: () => unknown,
 *   onAuthStateChangedFn: (auth: unknown, callback: () => void) => void,
 *   doc: Document,
 *   fetchFn: FetchFn,
 * }} deps - Core dependencies required to initialize the admin UI.
 * @returns {void}
 */
function validateInitAdminDeps({
  googleAuthModule,
  getAuthFn,
  onAuthStateChangedFn,
  doc,
  fetchFn,
}) {
  if (!googleAuthModule) {
    throw new TypeError('googleAuthModule must be provided');
  }
  requireFunction(getAuthFn, 'getAuthFn');
  requireFunction(onAuthStateChangedFn, 'onAuthStateChangedFn');
  requireDocumentLike(doc);
  requireFunction(fetchFn, 'fetchFn');
}

/**
 * Locate the main admin content container within the provided document.
 * @param {Document} doc - Document to query for the content element.
 * @returns {HTMLElement | null} Element containing admin controls when present.
 */
export function getAdminContent(doc) {
  return doc.getElementById('adminContent');
}

/**
 * Locate all sign-in button elements within the provided document.
 * @param {Document} doc - Document to query for sign-in controls.
 * @returns {NodeList} Node list of elements that trigger the sign-in flow.
 */
export function getSignInButtons(doc) {
  return doc.querySelectorAll('#signinButton');
}

/**
 * Locate all sign-out container elements within the provided document.
 * @param {Document} doc - Document to query for sign-out controls.
 * @returns {NodeList} Node list of elements that wrap sign-out actions.
 */
export function getSignOutSections(doc) {
  return doc.querySelectorAll('#signoutWrap');
}

/**
 * Safely access the current authenticated user object when available.
 * @param {{ currentUser?: unknown } | null | undefined} auth - Auth object retrieved from Firebase.
 * @returns {unknown | null} Current user when present, otherwise null.
 */
function getCurrentUserSafely(auth) {
  if (!auth) {
    return null;
  }
  return getAuthUser(auth);
}

/**
 * Extract the `currentUser` entry from the auth object.
 * @param {{ currentUser?: unknown }} auth - Auth object that may expose a current user.
 * @returns {unknown | null} Current user when the property exists.
 */
function getAuthUser(auth) {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  return null;
}

/**
 * Resolve the current user via the provided auth getter.
 * @param {() => { currentUser?: unknown } | null | undefined} getAuthFn - Function that returns the auth object.
 * @returns {unknown | null} Current user when available through the getter.
 */
export function getCurrentUser(getAuthFn) {
  const auth = resolveAuthInstance(getAuthFn);
  return getCurrentUserSafely(auth);
}

/**
 * Safely resolve the auth instance via the provided getter.
 * @param {() => { currentUser: unknown } | null | undefined} getAuthFn - Function that returns the auth object.
 * @returns {{ currentUser: unknown } | null | undefined} Resolved auth instance or nullish when unavailable.
 */
function resolveAuthInstance(getAuthFn) {
  if (typeof getAuthFn !== 'function') {
    return null;
  }

  return getAuthFn();
}

/**
 * Update the display state of sign-in and sign-out controls based on the user.
 * @param {{ uid?: string } | null | undefined} user - Current authenticated user.
 * @param {Array<HTMLElement> | NodeList} signIns - Elements that trigger sign-in.
 * @param {Array<HTMLElement> | NodeList} signOuts - Elements that trigger sign-out.
 */
export function updateAuthControlsDisplay(user, signIns, signOuts) {
  const isSignedIn = Boolean(user);

  signIns.forEach(element => {
    const el = /** @type {HTMLElement} */ (element);
    if (isSignedIn) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });

  signOuts.forEach(element => {
    const el = /** @type {HTMLElement} */ (element);
    if (isSignedIn) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

/**
 * Configure Firebase when running in browser environments.
 * @param {(config: { apiKey: string, authDomain: string, projectId: string }) => void} initApp - Firebase initialization helper.
 */
export function setupFirebase(initApp) {
  initApp({
    apiKey: 'AIzaSyDRc1CakoDi6airj7t7DgY4KDSlxNwKIIQ',
    authDomain: 'irien-465710.firebaseapp.com',
    projectId: 'irien-465710',
  });
}

/**
 * Initialize the admin UI with the provided auth helpers and globals.
 * @param {object} deps - Dependency bag describing the required environment.
 * @param {() => Promise<Record<string, string>>} deps.loadStaticConfigFn - Loader for static config values.
 * @param {() => unknown} deps.getAuthFn - Factory returning the Firebase auth instance.
 * @param {{ credential?: (token: string) => string }} deps.GoogleAuthProviderFn - Firebase provider helper.
 * @param {(auth: unknown, callback: () => void) => void} deps.onAuthStateChangedFn - Firebase listener binder.
 * @param {(auth: unknown, credential: unknown) => Promise<void> | void} deps.signInWithCredentialFn - Credential signer.
 * @param {(config: { apiKey: string, authDomain: string, projectId: string }) => void} deps.initializeAppFn - Firebase initializer.
 * @param {Storage} deps.sessionStorageObj - Storage object for caching tokens.
 * @param {{ error?: (message: string) => void }} deps.consoleObj - Logger for reporting sign-in issues.
 * @param {typeof globalThis} deps.globalThisObj - Global scope used for Google APIs and DOM helpers.
 * @param {Document} deps.documentObj - Document object containing the admin UI.
 * @param {FetchFn} deps.fetchObj - Fetch-like function for HTTP requests.
 * @param {(handlers: { initGoogleSignIn: (options?: GoogleSignInOptions) => void, signOut: () => Promise<void> }) => void} [deps.onHandlersReady] - Optional hook for tests to access memoized handlers.
 */
export function initAdminApp({
  loadStaticConfigFn,
  getAuthFn,
  GoogleAuthProviderFn,
  onAuthStateChangedFn,
  signInWithCredentialFn,
  initializeAppFn,
  sessionStorageObj,
  consoleObj,
  globalThisObj,
  documentObj,
  fetchObj,
  onHandlersReady,
}) {
  setupFirebase(initializeAppFn);

  /** @type {((options?: GoogleSignInOptions) => Promise<void> | void) | undefined} */
  let initGoogleSignInHandler;
  const getInitGoogleSignInHandler = () => {
    if (!initGoogleSignInHandler) {
      const auth = /** @type {object} */ (getAuthFn());
      initGoogleSignInHandler = createGoogleSignInInit({
        auth,
        storage: sessionStorageObj,
        logger: consoleObj,
        globalObject: globalThisObj,
        authProvider: GoogleAuthProviderFn,
        signInCredential: signInWithCredentialFn,
      });
    }
    return initGoogleSignInHandler;
  };

  const initGoogleSignIn = options => getInitGoogleSignInHandler()(options);

  /** @type {(() => Promise<void>) | undefined} */
  let signOutHandler;
  const getSignOutHandler = () => {
    if (!signOutHandler) {
      const auth = /** @type {{ signOut: () => void | Promise<void> }} */ (
        getAuthFn()
      );
      signOutHandler = createSignOut(auth, globalThisObj);
    }
    return signOutHandler;
  };

  const signOut = () => getSignOutHandler()();

  const googleAuth = {
    initGoogleSignIn,
    signOut,
    getIdToken,
  };

  onHandlersReady?.(googleAuth);

  initAdmin({
    googleAuthModule: googleAuth,
    loadStaticConfigFn,
    getAuthFn,
    onAuthStateChangedFn,
    doc: documentObj,
    fetchFn: fetchObj,
  });
}

/**
 * Create a removeItem helper that reads storage lazily and validates its API.
 * @param {() => Storage | null | undefined} getStorage - Factory for the storage object.
 * @returns {(key: string) => void} Function that removes an item using the provided storage.
 */
export function createRemoveItem(getStorage) {
  return key => {
    const storage = getStorage();
    ensureStorageAvailable(storage);
    ensureRemoveItemFunction(storage);
    storage.removeItem(key);
  };
}

/**
 * Ensure the provided storage object exists.
 * @param {Storage | null | undefined} storage Candidate session storage object.
 * @returns {void}
 */
function ensureStorageAvailable(storage) {
  if (!storage) {
    throw new Error('sessionStorage is not available');
  }
}

/**
 * Ensure the provided storage exposes a removeItem function.
 * @param {Storage} storage Session storage object exposing removeItem.
 * @returns {void}
 */
function ensureRemoveItemFunction(storage) {
  if (typeof storage.removeItem !== 'function') {
    throw new Error('sessionStorage.removeItem is not a function');
  }
}

/**
 * Build a handler that wraps sessionStorage access on the given global scope.
 * @param {typeof globalThis} scope - Global scope that should provide `sessionStorage`.
 * @returns {{ removeItem: (key: string) => void }} Session-storage handler.
 */
export function createSessionStorageHandler(scope = globalThis) {
  return {
    removeItem: createRemoveItem(() => scope?.sessionStorage),
  };
}

/**
 * Produce the helper that returns the current Google Accounts client if present.
 * @param {typeof globalThis} scope - Global scope that should hold `window`.
 * @returns {() => object | undefined} Getter for `google.accounts.id`.
 */
export function createGoogleAccountsId(scope = globalThis) {
  return () => resolveGoogleAccountsId(scope);
}

/**
 * Resolve the Google Accounts helper from the global scope.
 * @param {typeof globalThis} scope Global scope containing `window`.
 * @returns {GoogleAccountsClient | undefined} Google Accounts client when available.
 */
function resolveGoogleAccountsId(scope) {
  const win = scope?.window;
  return getGoogleAccountsIdFromWindow(win);
}

/**
 * Read the Google Accounts client off the provided window when available.
 * @param {Window | undefined} win Candidate window object.
 * @returns {GoogleAccountsClient | undefined} Google Accounts client or undefined.
 */
function getGoogleAccountsIdFromWindow(win) {
  return getGoogleAccountsCandidate(win)?.id;
}

/**
 * Retrieve the Google Accounts object from the window when available.
 * @param {Window | undefined} win Candidate window object.
 * @returns {unknown} Google Accounts object or `undefined`.
 */
function getGoogleAccountsCandidate(win) {
  return getGoogleObj(win)?.accounts;
}

/**
 * Pull the `google` namespace off the window when available.
 * @param {Window | undefined} win Candidate window object.
 * @returns {unknown} Google helper object.
 */
function getGoogleObj(win) {
  return win?.google;
}

/**
 * Resolve the `window` reference exposed by the provided scope.
 * @param {typeof globalThis} scope Global scope that should expose `window`.
 * @returns {Window} Resolved window object.
 */
function resolveScopeWindow(scope) {
  return ensureWindowAvailable(scope?.window);
}

/**
 * Throw when the provided window reference is missing.
 * @param {Window | undefined} win Candidate window object.
 * @returns {Window} Verified window object.
 */
function ensureWindowAvailable(win) {
  if (!win) {
    throw new Error('window is not available');
  }

  return win;
}

/**
 * Retrieve the `matchMedia` helper off the provided window.
 * @param {Window} win Window object exposing `matchMedia`.
 * @returns {(query: string) => MediaQueryList} Validated matchMedia function.
 */
function resolveMatchMediaFunction(win) {
  return ensureMatchMediaFunction(win.matchMedia);
}

/**
 * Throw when the provided matchMedia helper is invalid.
 * @param {((query: string) => MediaQueryList) | undefined} matchMediaCandidate Candidate helper.
 * @returns {(query: string) => MediaQueryList} Verified matchMedia helper.
 */
function ensureMatchMediaFunction(matchMediaCandidate) {
  if (typeof matchMediaCandidate !== 'function') {
    throw new Error('window.matchMedia is not a function');
  }

  return matchMediaCandidate;
}

/**
 * Resolve the `document` reference exposed by the provided scope.
 * @param {typeof globalThis} scope Global scope that should expose `document`.
 * @returns {Document} Resolved document object.
 */
function resolveScopeDocument(scope) {
  return ensureDocumentAvailable(scope?.document);
}

/**
 * Throw when the provided document reference is missing.
 * @param {Document | undefined} doc Candidate document object.
 * @returns {Document} Verified document object.
 */
function ensureDocumentAvailable(doc) {
  if (!doc) {
    throw new Error('document is not available');
  }

  return doc;
}

/**
 * Retrieve the `querySelectorAll` helper off the provided document.
 * @param {Document} doc Document exposing `querySelectorAll`.
 * @returns {(selector: string) => NodeList} Validated querySelectorAll function.
 */
function resolveQuerySelectorAllFunction(doc) {
  const querySelectorAll = doc.querySelectorAll;
  if (typeof querySelectorAll !== 'function') {
    throw new Error('document.querySelectorAll is not a function');
  }

  return querySelectorAll;
}

/**
 * Build a matchMedia helper that validates the vendor API.
 * @param {typeof globalThis} scope - Global scope exposing `window`.
 * @returns {(query: string) => MediaQueryList} matchMedia wrapper.
 */
export function createMatchMedia(scope = globalThis) {
  return query => {
    const win = resolveScopeWindow(scope);
    const matchMedia = resolveMatchMediaFunction(win);
    return matchMedia.call(win, query);
  };
}

/**
 * Build a querySelectorAll helper for the provided document.
 * @param {typeof globalThis} scope - Global scope that should provide `document`.
 * @returns {(selector: string) => NodeList} querySelectorAll wrapper.
 */
export function createQuerySelectorAll(scope = globalThis) {
  return selector => {
    const doc = resolveScopeDocument(scope);
    const querySelectorAll = resolveQuerySelectorAllFunction(doc);
    return querySelectorAll(selector);
  };
}

/**
 * Build normalized dependencies for `createInitGoogleSignIn`.
 * @param {object} deps Dependency bag for building the initializer.
 * @param {object} deps.auth Firebase Auth instance that exposes `currentUser`.
 * @param {Storage} deps.storage Storage implementation used to cache ID tokens.
 * @param {Logger} deps.logger Logger used for reporting initialization errors.
 * @param {typeof globalThis} [deps.globalObject] Global scope providing DOM helpers.
 * @param {{ credential?: (token: string) => string }} deps.authProvider Google auth provider helper.
 * @param {(auth: object, credential: unknown) => Promise<void> | void} deps.signInCredential Credential signer.
 * @returns {object} Normalized dependency bag for `createInitGoogleSignIn`.
 */
export function buildGoogleSignInDeps({
  auth,
  storage,
  logger,
  globalObject = globalThis,
  authProvider,
  signInCredential,
}) {
  return {
    googleAccountsId: createGoogleAccountsId(globalObject),
    credentialFactory: createCredentialFactory(authProvider),
    signInWithCredential: signInCredential,
    auth,
    storage,
    matchMedia: createMatchMedia(globalObject),
    querySelectorAll: createQuerySelectorAll(globalObject),
    logger,
  };
}

/**
 * Build the configured initializer for Google sign-in when provided concrete dependencies.
 * @param {object} deps Dependency bag describing the initializer inputs.
 * @param {object} deps.auth Firebase Auth instance.
 * @param {Storage} deps.storage Storage implementation for persisting tokens.
 * @param {{ error?: (message: string) => void }} deps.logger Logger for reporting errors.
 * @param {typeof globalThis} deps.globalObject Global scope used for DOM helpers.
 * @param {{ credential?: (token: string) => string }} deps.authProvider GoogleAuthProvider instance.
 * @param {(auth: object, credential: unknown) => Promise<void> | void} deps.signInCredential `signInWithCredential` helper.
 * @returns {(options?: GoogleSignInOptions) => Promise<void> | void} Initialized sign-in function.
 */
export function createGoogleSignInInit(deps) {
  const googleSignInDeps = buildGoogleSignInDeps(/** @type {any} */ (deps));
  return createInitGoogleSignIn(googleSignInDeps);
}

/**
 * Create a lazily initialized helper that provides the configured Google sign-in handler.
 * @param {object} deps Dependencies for the handler factory.
 * @param {() => unknown} deps.getAuthFn Getter returning the Firebase auth instance.
 * @param {Storage} deps.sessionStorageObj Storage for cached tokens.
 * @param {{ error?: (message: string) => void }} deps.consoleObj Logger for reporting errors.
 * @param {typeof globalThis} deps.globalThisObj Global scope with DOM helpers.
 * @param {{ credential?: (token: string) => string }} deps.googleAuthProviderFn Google auth provider helper.
 * @param {(auth: unknown, credential: unknown) => Promise<void> | void} deps.signInWithCredentialFn Function sending credentials to Firebase.
 * @returns {() => (options?: GoogleSignInOptions) => Promise<void> | void} Factory for the init handler.
 */
export function createInitGoogleSignInHandlerFactory(deps) {
  const {
    getAuthFn,
    sessionStorageObj,
    consoleObj,
    globalThisObj,
    googleAuthProviderFn,
    signInWithCredentialFn,
  } = deps;

  let initGoogleSignInHandler;
  return () => {
    if (!initGoogleSignInHandler) {
      const auth = getAuthFn();
      initGoogleSignInHandler = createGoogleSignInInit({
        auth,
        storage: sessionStorageObj,
        logger: consoleObj,
        globalObject: globalThisObj,
        authProvider: googleAuthProviderFn,
        signInCredential: signInWithCredentialFn,
      });
    }
    return initGoogleSignInHandler;
  };
}

/**
 * Create a credential factory from the supplied Google Auth provider.
 * @param {{ credential?: (token: string) => string } | null | undefined} provider - Provider exposing the credential helper.
 * @returns {(token: string) => string} Credential factory.
 */
export function createCredentialFactory(provider) {
  ensureGoogleAuthProvider(provider);
  return validateCredentialFactory(provider);
}

/**
 * Ensure the Google Auth provider is available.
 * @param {{ credential?: (token: string) => string } | null | undefined} provider - Provider under validation.
 * @returns {{ credential?: (token: string) => string }} Validated provider reference.
 * @throws {TypeError} When the provider is missing.
 */
function ensureGoogleAuthProvider(provider) {
  if (!provider) {
    throw new TypeError('GoogleAuthProvider must be provided');
  }

  return provider;
}

/**
 * Validate the credential helper exposed by the Google Auth provider.
 * @param {{ credential?: (token: string) => string }} provider - Provider exposing the credential helper.
 * @returns {(token: string) => string} Credential factory extracted from the provider.
 * @throws {TypeError} When the credential helper is not a function.
 */
function validateCredentialFactory(provider) {
  if (typeof provider.credential !== 'function') {
    throw new TypeError('GoogleAuthProvider must expose credential');
  }

  return provider.credential;
}

/**
 * Ensure the Google Identity client exposes the expected interface before usage.
 * @param {GoogleAccountsClient | undefined} accountsId - Candidate Google Identity client.
 * @param {{ error?: (message: string) => void }} logger - Logger used to report missing scripts.
 * @returns {boolean} True when the client provides both `initialize` and `renderButton`.
 */
export function ensureGoogleIdentityAvailable(accountsId, logger) {
  if (!hasRequiredGoogleIdentityMethods(accountsId)) {
    reportMissingGoogleIdentity(logger);
    return false;
  }

  return true;
}

/**
 * Render the sign-in button and keep it synchronized with the color scheme.
 * @param {GoogleAccountsClient} accountsId - Google Identity client used to render buttons.
 * @param {(selector: string) => NodeList} querySelectorAll - DOM helper used to resolve sign-in button targets.
 * @param {{ matches: boolean, addEventListener?: (type: string, listener: () => void) => void } | undefined} mediaQueryList - Optional media query list for theme switching.
 * @returns {void}
 */
/**
 * Determine whether a list-like object supports event listeners.
 * @param {{ addEventListener?: (type: string, listener: () => void) => void } | undefined} list - Candidate object for listening to events.
 * @returns {boolean} True when event listeners can be attached.
 */
function canListen(list) {
  return Boolean(list && typeof list.addEventListener === 'function');
}

/**
 * Attach tooling to refresh the rendered buttons when the media query changes.
 * @param {{
 *   addEventListener?: (type: string, listener: () => void) => void,
 * } | undefined} list - Media query list for subscribing to theme changes.
 * @param {() => void} listener - Callback invoked when the media query matches changes.
 * @returns {void}
 */
function attachChangeListener(list, listener) {
  if (canListen(list)) {
    list.addEventListener('change', listener);
  }
}

/**
 * Initialize the sign-in button renderer and keep it synchronized with the color scheme.
 * @param {GoogleAccountsClient} accountsId - Google Identity client used to render buttons.
 * @param {(selector: string) => NodeList} querySelectorAll - DOM helper for locating button targets.
 * @param {{ matches?: boolean, addEventListener?: (type: string, listener: () => void) => void } | undefined} mediaQueryList - Media query that informs dark-mode styling.
 * @returns {void}
 */
function setupSignInButtonRenderer(
  accountsId,
  querySelectorAll,
  mediaQueryList
) {
  const renderButton = () =>
    renderSignInButtons(accountsId, querySelectorAll, mediaQueryList);

  renderButton();
  attachChangeListener(mediaQueryList, renderButton);
}

/**
 * Build a check access handler tied to the provided auth getter and document.
 * @param {() => { currentUser?: { uid?: string } } | null | undefined} getAuthFn - Getter for the auth instance.
 * @param {Document} doc - Document used to resolve admin controls.
 * @returns {() => void} Function that evaluates the current access state.
 */
export function createCheckAccess(getAuthFn, doc) {
  return function checkAccess() {
    const user = getCurrentUser(getAuthFn);
    const content = getAdminContent(doc);
    const signins = getSignInButtons(doc);
    const signouts = getSignOutSections(doc);

    updateAuthControlsDisplay(user, signins, signouts);

    const hasAccess = isAdminUser(user);
    setElementVisibility(content, hasAccess);
  };
}

/**
 * Determine whether the current user is the admin.
 * @param {{ uid?: string } | null | undefined} user - Candidate authenticated user.
 * @returns {boolean} True when the user matches the admin UID.
 */
function isAdminUser(user) {
  return Boolean(user && user.uid === ADMIN_UID);
}

/**
 * Set the element's display style based on the visibility flag.
 * @param {HTMLElement | null | undefined} element - Element whose visibility should change.
 * @param {boolean} visible - True to show the element, false to hide it.
 * @returns {void}
 */
function applyVisibility(element, visible) {
  if (visible) {
    element.style.display = '';
  } else {
    element.style.display = 'none';
  }
}

/**
 * Conditionally apply visibility updates when the element is present.
 * @param {HTMLElement | null | undefined} element - Element targeted for visibility changes.
 * @param {boolean} visible - Desired visibility state.
 * @returns {void}
 */
function setElementVisibility(element, visible) {
  if (!element) {
    return;
  }
  applyVisibility(element, visible);
}
