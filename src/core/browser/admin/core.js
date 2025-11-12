import { ADMIN_UID } from '../common-core.js';
import { createAdminTokenAction } from './token-action.js';

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
 * Normalize static config into admin endpoints with production fallbacks.
 * @param {Record<string, string>} config - Static config values keyed by endpoint name.
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}} Normalized admin endpoints with production fallbacks.
 */
export function mapConfigToAdminEndpoints(config) {
  return {
    triggerRenderContentsUrl:
      config?.triggerRenderContentsUrl ??
      DEFAULT_ADMIN_ENDPOINTS.triggerRenderContentsUrl,
    markVariantDirtyUrl:
      config?.markVariantDirtyUrl ??
      DEFAULT_ADMIN_ENDPOINTS.markVariantDirtyUrl,
    generateStatsUrl:
      config?.generateStatsUrl ?? DEFAULT_ADMIN_ENDPOINTS.generateStatsUrl,
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
  if (typeof createAdminEndpointsPromiseFn !== 'function') {
    throw new TypeError('createAdminEndpointsPromiseFn must be a function');
  }

  let adminEndpointsPromise;

  return function getAdminEndpoints() {
    if (!adminEndpointsPromise) {
      adminEndpointsPromise = createAdminEndpointsPromiseFn();
    }

    return adminEndpointsPromise;
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
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

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
  const status = res?.status;
  return status ?? 'unknown';
}

/**
 * Resolve the HTTP status text for a trigger render response.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @returns {string} Known status text or the string "unknown" when unavailable.
 */
function resolveTriggerRenderStatusText(res) {
  const statusText = res?.statusText;
  if (!statusText) {
    return 'unknown';
  }

  return statusText;
}

/**
 * Attempt to read a textual body from the trigger render response.
 * @param {Response|null|undefined} res Response returned by the trigger render request.
 * @returns {Promise<string>} Body content when readable, otherwise an empty string.
 */
async function readTriggerRenderBody(res) {
  const readText = res?.text;
  if (typeof readText !== 'function') {
    return '';
  }

  const body = await readText.call(res);
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
  if (res && res.ok) {
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
  getAdminEndpoints: getAdminEndpointsFn,
  fetchFn,
  token,
  showMessage,
}) {
  try {
    const res = await postTriggerRenderContents(
      getAdminEndpointsFn,
      fetchFn,
      token
    );
    await announceTriggerRenderResult(res, showMessage);
  } catch (e) {
    let message;
    if (e instanceof Error) {
      message = e.message;
    } else {
      message = String(e);
    }
    showMessage(`Render failed: ${message}`);
  }
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
    action: ({
      token,
      getAdminEndpoints,
      fetchFn: fetch,
      showMessage: report,
    }) =>
      executeTriggerRender({
        getAdminEndpoints,
        fetchFn: fetch,
        token,
        showMessage: report,
      }),
  });
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
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof triggerRenderFn !== 'function') {
    throw new TypeError('triggerRenderFn must be a function');
  }

  const button = doc.getElementById(elementId);
  if (button?.addEventListener) {
    button.addEventListener('click', triggerRenderFn);
  }

  return button ?? null;
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
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof regenerateVariantFn !== 'function') {
    throw new TypeError('regenerateVariantFn must be a function');
  }

  const form = doc.getElementById('regenForm');
  if (form?.addEventListener) {
    form.addEventListener('submit', regenerateVariantFn);
  }

  return form ?? null;
}

/**
 * Create a function that wires sign-out links to the provided sign-out handler.
 * @param {Document} doc - Document used to locate sign-out links.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Google auth helper with a `signOut` method.
 * @returns {() => void} Function that attaches click handlers to sign-out links.
 */
export function createWireSignOut(doc, googleAuth) {
  if (!doc || typeof doc.querySelectorAll !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (!googleAuth || typeof googleAuth.signOut !== 'function') {
    throw new TypeError('googleAuth must provide a signOut function');
  }

  return function wireSignOut() {
    doc.querySelectorAll('#signoutLink').forEach(link => {
      if (link?.addEventListener) {
        link.addEventListener('click', async event => {
          event?.preventDefault?.();
          await googleAuth.signOut();
        });
      }
    });
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
  if (!auth || typeof auth !== 'object') {
    throw new TypeError('auth must be provided');
  }
  if (!storage || typeof storage.setItem !== 'function') {
    throw new TypeError('storage must provide a setItem function');
  }
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
 * @returns {{
 *   resolveGoogleAccountsId: () => GoogleAccountsClient | undefined,
 *   credentialFactory: (credential: string) => unknown,
 *   signInWithCredential: (auth: { currentUser?: { getIdToken?: () => Promise<string> } }, credential: unknown) => Promise<void> | void,
 *   auth: { currentUser?: { getIdToken?: () => Promise<string> } },
 *   storage: { setItem: (key: string, value: string) => void },
 *   matchMedia: (query: string) => { matches: boolean, addEventListener?: (type: string, listener: () => void) => void },
 *   querySelectorAll: (selector: string) => NodeList,
 *   safeLogger: { error?: (message: string) => void },
 * }} Normalized dependencies with required helpers.
 */
function normalizeGoogleSignInDeps(deps = {}) {
  const {
    googleAccountsId,
    credentialFactory,
    signInWithCredential,
    auth,
    storage,
    matchMedia,
    querySelectorAll,
    logger = console,
  } = deps;

  validateGoogleSignInDeps({
    credentialFactory,
    signInWithCredential,
    auth,
    storage,
    matchMedia,
    querySelectorAll,
  });

  let resolveGoogleAccountsId;
  if (typeof googleAccountsId === 'function') {
    resolveGoogleAccountsId = googleAccountsId;
  } else {
    resolveGoogleAccountsId = () => googleAccountsId;
  }

  let safeLogger;
  if (logger && typeof logger.error === 'function') {
    safeLogger = logger;
  } else {
    safeLogger = console;
  }

  return {
    resolveGoogleAccountsId,
    credentialFactory,
    signInWithCredential,
    auth,
    storage,
    matchMedia,
    querySelectorAll,
    safeLogger,
  };
}

/**
 * Determine whether the Google Identity client exposes the expected methods.
 * @param {unknown} accountsId - Candidate Google Identity client.
 * @returns {boolean} True when the client provides initialize and renderButton.
 */
function hasRequiredGoogleIdentityMethods(accountsId) {
  return (
    Boolean(accountsId) &&
    typeof accountsId.initialize === 'function' &&
    typeof accountsId.renderButton === 'function'
  );
}

/**
 * Report a missing Google Identity script to the provided logger.
 * @param {{ error?: (message: string) => void }} logger - Logger used for reporting.
 * @returns {void}
 */
function reportMissingGoogleIdentity(logger) {
  logger?.error?.('Google Identity script missing');
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
  const getIdToken = currentUser?.getIdToken;

  if (typeof getIdToken !== 'function') {
    throw new TypeError('auth.currentUser.getIdToken must be a function');
  }

  const idToken = await getIdToken.call(currentUser);
  storage.setItem('id_token', idToken);
  onSignIn?.(idToken);
}

/**
 * Render Google sign-in buttons with a theme derived from the media query.
 * @param {GoogleAccountsClient} accountsId - Google Identity client used to render buttons.
 * @param {(selector: string) => NodeList} querySelectorAll - DOM query helper.
 * @param {{ matches: boolean, addEventListener?: (type: string, listener: () => void) => void } | undefined} mediaQueryList - Media query list controlling the theme.
 * @returns {void}
 */
function renderSignInButtons(accountsId, querySelectorAll, mediaQueryList) {
  const elements = Array.from(querySelectorAll('#signinButton') ?? []);
  let theme = 'filled_blue';

  if (mediaQueryList?.matches) {
    theme = 'filled_black';
  }

  elements.forEach(el => {
    if (!el) {
      return;
    }

    el.innerHTML = '';
    accountsId.renderButton(el, {
      theme,
      size: 'large',
      text: 'signin_with',
    });
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
    const {
      resolveGoogleAccountsId,
      credentialFactory,
      signInWithCredential,
      auth,
      storage,
      matchMedia,
      querySelectorAll,
      safeLogger,
    } = normalizedDeps;

    const accountsId = resolveGoogleAccountsId();

    if (!hasRequiredGoogleIdentityMethods(accountsId)) {
      reportMissingGoogleIdentity(safeLogger);
      return;
    }

    accountsId.initialize({
      ['client_id']:
        '848377461162-rv51umkquokgoq0hsnp1g0nbmmrv7kl0.apps.googleusercontent.com',
      callback: options =>
        handleCredentialSignIn(options, {
          credentialFactory,
          signInWithCredential,
          auth,
          storage,
          onSignIn,
        }),
      ['ux_mode']: 'popup',
    });

    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)');
    const renderButton = () =>
      renderSignInButtons(accountsId, querySelectorAll, mediaQueryList);

    renderButton();
    mediaQueryList?.addEventListener?.('change', renderButton);
  };
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
        const { generateStatsUrl } = await getAdminEndpoints();
        await fetch(generateStatsUrl, {
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
export function createRegenerateVariant({
  googleAuth,
  doc,
  showMessage,
  getAdminEndpointsFn,
  fetchFn,
}) {
  if (!googleAuth || typeof googleAuth.getIdToken !== 'function') {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof showMessage !== 'function') {
    throw new TypeError('showMessage must be a function');
  }
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

  return async function regenerateVariant(event) {
    event?.preventDefault?.();

    const token = googleAuth.getIdToken();
    if (!token) {
      return;
    }

    const input = doc.getElementById('regenInput');
    const pageVariant = parsePageVariantInput(input);

    if (!pageVariant) {
      showMessage('Invalid format');
      return;
    }

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
  };
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
function getTrimmedInputValue(inputElement) {
  if (!inputElement) {
    return '';
  }

  const { value } = inputElement;
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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
 * Submit a request to mark a variant dirty for regeneration.
 * @param {{
 *   fetchFn: FetchFn,
 *   getAdminEndpointsFn: () => Promise<{ markVariantDirtyUrl: string }>,
 *   token: string,
 *   pageVariant: { page: number, variant: string },
 * }} options - Dependencies and payload for the regenerate request.
 * @returns {Promise<void>} Promise that resolves when the request succeeds.
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

  if (!res?.ok) {
    throw new Error('fail');
  }
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
  if (typeof getStatusParagraphFn !== 'function') {
    throw new TypeError('getStatusParagraphFn must be a function');
  }
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }

  const statusParagraph = getStatusParagraphFn(doc);

  return function showMessage(text) {
    if (!statusParagraph) {
      return;
    }

    statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
  };
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
 */
export function initAdmin({
  googleAuthModule,
  loadStaticConfigFn,
  getAuthFn,
  onAuthStateChangedFn,
  doc,
  fetchFn,
}) {
  if (!googleAuthModule) {
    throw new TypeError('googleAuthModule must be provided');
  }
  if (typeof getAuthFn !== 'function') {
    throw new TypeError('getAuthFn must be a function');
  }
  if (typeof onAuthStateChangedFn !== 'function') {
    throw new TypeError('onAuthStateChangedFn must be a function');
  }
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

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
 * Safely access the current authenticated user.
 * @param {() => { currentUser: unknown } | null | undefined} getAuthFn - Getter for the auth instance.
 * @returns {unknown | null} Current user when available.
 */
export function getCurrentUser(getAuthFn) {
  if (typeof getAuthFn !== 'function') {
    return null;
  }

  const auth = getAuthFn();
  return auth?.currentUser ?? null;
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
    if (isSignedIn) {
      element.style.display = 'none';
    } else {
      element.style.display = '';
    }
  });

  signOuts.forEach(element => {
    if (isSignedIn) {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  });
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

    if (!user || user.uid !== ADMIN_UID) {
      if (content) content.style.display = 'none';
      return;
    }

    if (content) content.style.display = '';
  };
}
