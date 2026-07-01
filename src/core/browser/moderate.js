import { createLoadStaticConfig } from './load-static-config-core.js';
import { createAuthedFetch } from './moderation/authedFetch.js';
import { dom } from './document.js';
import {
  createGetModerationEndpointsFromStaticConfig,
  DEFAULT_MODERATION_ENDPOINTS,
} from './moderation/endpoints.js';
import { getIdToken } from './browser-core.js';
import {
  createGoogleSignInInit,
  createSignOut,
  isAdminWithDeps,
  setupFirebase,
} from './admin-core.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';

setupFirebase(initializeApp);

/** @type {Document | null} */
let moderateDocument = null;
/** @type {typeof fetch | null} */
let moderateFetchFn = null;
/** @type {Storage | null} */
let moderateSessionStorage = null;
/** @type {typeof globalThis | null} */
let moderateGlobalObject = null;

const loadStaticConfig = createLoadStaticConfig({
  fetchFn: (input, init) => moderateFetchFn(input, init),
  warn: (message, error) => console.warn(message, error),
});

let initGoogleSignInHandler;
const getInitGoogleSignInHandler = () => {
  if (!initGoogleSignInHandler) {
    const auth = getAuth();
    initGoogleSignInHandler = createGoogleSignInInit({
      auth,
      storage: moderateSessionStorage,
      logger: console,
      globalObject: moderateGlobalObject,
      authProvider: GoogleAuthProvider,
      signInWithCredential: signInWithCredential,
    });
  }
  return initGoogleSignInHandler;
};

const initGoogleSignIn = options => getInitGoogleSignInHandler()(options);

let signOutHandler;
const getSignOutHandler = () => {
  if (!signOutHandler) {
    const auth = getAuth();
    signOutHandler = createSignOut(auth, moderateGlobalObject);
  }
  return signOutHandler;
};

const signOut = () => getSignOutHandler()();

const isAdmin = () => isAdminWithDeps(moderateSessionStorage, JSON, atob);

const getModerationEndpoints = createGetModerationEndpointsFromStaticConfig(
  loadStaticConfig,
  DEFAULT_MODERATION_ENDPOINTS,
  console
);

/**
 * Enable or disable moderation action buttons.
 * @param {boolean} disabled Whether buttons should be disabled.
 */
function toggleApproveReject(disabled) {
  ['approveBtn', 'rejectBtn'].forEach(id => {
    const el = moderateDocument.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

/**
 * Display an animated status message.
 * @param {string} id Element ID to display.
 * @param {string} text Base text for the message.
 * @returns {() => void} Function to stop the animation.
 */
function startAnimation(id, text) {
  const el = moderateDocument.getElementById(id);
  if (!el) return () => {};
  let dots = 1;
  el.textContent = `${text}.`;
  el.style.display = 'block';
  const intervalId = dom.setInterval(() => {
    dots = (dots % 3) + 1;
    el.textContent = `${text}${'.'.repeat(dots)}`;
  }, 500);
  return () => {
    dom.clearInterval(intervalId);
    el.style.display = 'none';
  };
}

/**
 * Create a DOM element with optional text content.
 * @param {string} tagName The tag name for the element.
 * @param {string} text The text content to assign.
 * @returns {HTMLElement} The created element.
 */
function createTextElement(tagName, text) {
  const el = moderateDocument.createElement(tagName);
  el.textContent = text || '';
  return el;
}

/**
 * Append the variant options list to the container.
 * @param {HTMLElement} container The container receiving the list.
 * @param {Array<{content: string, targetPageNumber?: number}>} options Variant options.
 * @returns {void}
 */
function appendOptionsList(container, options) {
  if (!Array.isArray(options) || options.length === 0) return;
  const list = moderateDocument.createElement('ol');
  options.forEach(opt => {
    const li = moderateDocument.createElement('li');
    if (opt.targetPageNumber !== undefined) {
      li.textContent = `${opt.content} (${opt.targetPageNumber})`;
    } else {
      li.textContent = opt.content;
    }
    list.appendChild(li);
  });
  container.appendChild(list);
}

/**
 * Wire up and enable moderation action buttons.
 * @returns {void}
 */
function enableModerationButtons() {
  const approve = moderateDocument.getElementById('approveBtn');
  const reject = moderateDocument.getElementById('rejectBtn');
  if (!approve || !reject) return;
  approve.disabled = false;
  reject.disabled = false;
  approve.onclick = () => submitRating(true);
  reject.onclick = () => submitRating(false);
}

/**
 * Render the moderation variant contents.
 * @param {{title?: string, author?: string, content?: string, options?: Array<{content: string, targetPageNumber?: number}>}} data Variant payload.
 * @returns {void}
 */
function renderVariant(data) {
  const container = moderateDocument.getElementById('pageContent');
  if (!container) return;

  container.style.display = '';
  container.innerHTML = '';

  container.appendChild(createTextElement('h3', data.title));
  let author = '';
  if (data.author) {
    author = `By ${data.author}`;
  }
  container.appendChild(createTextElement('p', author));
  container.appendChild(createTextElement('p', data.content));
  appendOptionsList(container, data.options);

  enableModerationButtons();
}

/**
 * Determine whether the load should be retried for a 404 error.
 * @param {unknown} err The caught error.
 * @param {boolean} retried Whether a retry has already occurred.
 * @returns {boolean} True if a retry should be attempted.
 */
function shouldRetryLoad(err, retried) {
  if (retried) return false;
  return Boolean(
    err && typeof err.message === 'string' && err.message.includes('HTTP 404')
  );
}

/**
 * Attempt to assign a new job and reload the variant.
 * @returns {Promise<void>} Resolves once the retry flow completes.
 */
async function retryLoadVariant() {
  try {
    await assignJob();
    await loadVariant(true);
  } catch (innerErr) {
    console.error(innerErr);
  }
}

/**
 * Register the click handler for the sign-out button.
 */
function wireSignOut() {
  moderateDocument.querySelectorAll('#signoutLink').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      await signOut();
      resetModerationUi();
      toggleApproveReject(true);
      moderateDocument.body.classList.remove('authed');
    });
  });
}

/**
 * Ask the back-end for a new moderation job.
 * Resolves when the function returns 201 Created.
 */
async function assignJob() {
  const token = getIdToken();
  if (!token) throw new Error('not signed in');

  const body = new URLSearchParams();
  body.set('id_token', token);

  const { assignModerationJobUrl } = await getModerationEndpoints();
  const resp = await moderateFetchFn(assignModerationJobUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`assign job: HTTP ${resp.status}`);
}

/**
 * Load the current moderation variant and render it.
 * @param {boolean} [retried] Whether a retry has already been attempted.
 * @returns {Promise<void>} Promise resolving when rendering is complete.
 */
async function loadVariant(retried = false) {
  const stopFetching = startAnimation('fetching', 'Fetching');
  try {
    const { getModerationVariantUrl } = await getModerationEndpoints();
    const data = await authedFetch(getModerationVariantUrl);
    renderVariant(data);
  } catch (err) {
    if (shouldRetryLoad(err, retried)) {
      await retryLoadVariant();
    } else {
      console.error(err);
    }
  } finally {
    stopFetching();
  }
}

/**
 * Submit a moderation rating.
 * @param {boolean} isApproved Whether the page was approved.
 */
async function submitRating(isApproved) {
  const approve = moderateDocument.getElementById('approveBtn');
  const reject = moderateDocument.getElementById('rejectBtn');
  if (approve) approve.disabled = true;
  if (reject) reject.disabled = true;
  const stopSaving = startAnimation('saving', 'Saving');
  try {
    const { submitModerationRatingUrl } = await getModerationEndpoints();
    await authedFetch(submitModerationRatingUrl, {
      method: 'POST',
      body: JSON.stringify({ isApproved }),
    });
    await assignJob();
    stopSaving();
    await loadVariant();
  } catch (err) {
    stopSaving();
    console.error(err);
    alert("Sorry, that didn't work. See console for details.");
    if (approve) approve.disabled = false;
    if (reject) reject.disabled = false;
  }
}

/**
 * Reset the moderation page to its signed-out state.
 */
function resetModerationUi() {
  moderateDocument
    .querySelectorAll('#signoutWrap')
    .forEach(el => (el.style.display = 'none'));
  moderateDocument
    .querySelectorAll('#signinButton')
    .forEach(el => (el.style.display = ''));
  moderateDocument
    .querySelectorAll('.admin-link')
    .forEach(link => (link.style.display = 'none'));
  const content = moderateDocument.getElementById('pageContent');
  if (content) {
    content.innerHTML = '';
    content.style.display = 'none';
  }
}

const fetchJson = async (url, init) => {
  const fetchImpl = moderateFetchFn ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available');
  }

  const resp = await fetchImpl(url, init);
  if (!resp.ok) {
    const body = await readErrorResponseBody(resp);
    const error = new Error(formatHttpErrorMessage(resp.status, body));
    error.status = resp.status;
    throw error;
  }
  const data = await resp.json();
  return {
    ok: true,
    status: resp.status,
    json: () => data,
  };
};

/**
 * Read the response body for failed moderation requests when available.
 * @param {{ text?: () => Promise<string> }} response Fetch response.
 * @returns {Promise<string>} Response text or an empty string.
 */
async function readErrorResponseBody(response) {
  if (typeof response.text !== 'function') {
    return '';
  }

  return response.text().catch(() => '');
}

/**
 * Format an HTTP error with a compact body snippet for cloud diagnostics.
 * @param {number} status HTTP response status.
 * @param {string} body Response body text.
 * @returns {string} Error message.
 */
function formatHttpErrorMessage(status, body) {
  const snippet = body.trim().slice(0, 300);
  if (!snippet) {
    return `HTTP ${status}`;
  }

  return `HTTP ${status}: ${snippet}`;
}

export const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

/**
 * Initialize the moderation page with injected browser globals.
 * @param {{
 *   documentObj: Document,
 *   fetchFn: typeof fetch,
 *   sessionStorageObj: Storage,
 *   globalObject: typeof globalThis,
 * }} deps Browser globals.
 * @returns {() => void} Entry handle.
 */
export function createModerateHandle(deps = {}) {
  moderateDocument = deps.documentObj;
  moderateFetchFn = deps.fetchFn;
  moderateSessionStorage = deps.sessionStorageObj;
  moderateGlobalObject = deps.globalObject;

  return async function handleModerate() {
    const config = await loadStaticConfig();
    if (config.disableGoogleSignIn !== true) {
      initGoogleSignIn({
        onSignIn: () => {
          moderateDocument.body.classList.add('authed');
          moderateDocument
            .querySelectorAll('#signinButton')
            .forEach(el => (el.style.display = 'none'));
          moderateDocument
            .querySelectorAll('#signoutWrap')
            .forEach(el => (el.style.display = ''));
          if (isAdmin()) {
            moderateDocument
              .querySelectorAll('.admin-link')
              .forEach(link => (link.style.display = ''));
          }
          wireSignOut();
          loadVariant();
        },
      });
    }
    if (getIdToken()) {
      moderateDocument.body.classList.add('authed');
      moderateDocument
        .querySelectorAll('#signinButton')
        .forEach(el => (el.style.display = 'none'));
      moderateDocument
        .querySelectorAll('#signoutWrap')
        .forEach(el => (el.style.display = ''));
      if (isAdmin()) {
        moderateDocument
          .querySelectorAll('.admin-link')
          .forEach(link => (link.style.display = ''));
      }
      wireSignOut();
      loadVariant();
    }
  };
}
