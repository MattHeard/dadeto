import { loadStaticConfig } from './loadStaticConfig.js';
import { createAuthedFetch } from './authedFetch.js';
import {
  createGetModerationEndpointsFromStaticConfig,
  DEFAULT_MODERATION_ENDPOINTS,
} from './moderation/endpoints.js';
import { getIdToken } from '../core/browser/browser-core.js';
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

let initGoogleSignInHandler;
const getInitGoogleSignInHandler = () => {
  if (!initGoogleSignInHandler) {
    const auth = getAuth();
    initGoogleSignInHandler = createGoogleSignInInit({
      auth,
      storage: sessionStorage,
      logger: console,
      globalObject: globalThis,
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
    signOutHandler = createSignOut(auth, globalThis);
  }
  return signOutHandler;
};

const signOut = () => getSignOutHandler()();

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

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
    const el = document.getElementById(id);
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
  const el = document.getElementById(id);
  if (!el) return () => {};
  let dots = 1;
  el.textContent = `${text}.`;
  el.style.display = 'block';
  const intervalId = setInterval(() => {
    dots = (dots % 3) + 1;
    el.textContent = `${text}${'.'.repeat(dots)}`;
  }, 500);
  return () => {
    clearInterval(intervalId);
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
  const el = document.createElement(tagName);
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
  const list = document.createElement('ol');
  options.forEach(opt => {
    const li = document.createElement('li');
    li.textContent =
      opt.targetPageNumber !== undefined
        ? `${opt.content} (${opt.targetPageNumber})`
        : opt.content;
    list.appendChild(li);
  });
  container.appendChild(list);
}

/**
 * Wire up and enable moderation action buttons.
 * @returns {void}
 */
function enableModerationButtons() {
  const approve = document.getElementById('approveBtn');
  const reject = document.getElementById('rejectBtn');
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
  const container = document.getElementById('pageContent');
  if (!container) return;

  container.style.display = '';
  container.innerHTML = '';

  container.appendChild(createTextElement('h3', data.title));
  const author = data.author ? `By ${data.author}` : '';
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
  document.querySelectorAll('#signoutLink').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      await signOut();
      document
        .querySelectorAll('#signoutWrap')
        .forEach(el => (el.style.display = 'none'));
      document
        .querySelectorAll('#signinButton')
        .forEach(el => (el.style.display = ''));
      document
        .querySelectorAll('.admin-link')
        .forEach(link => (link.style.display = 'none'));
      const content = document.getElementById('pageContent');
      if (content) {
        content.innerHTML = '';
        content.style.display = 'none';
      }
      toggleApproveReject(true);
      document.body.classList.remove('authed');
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

  const body = new URLSearchParams({ id_token: token });

  const { assignModerationJobUrl } = await getModerationEndpoints();
  const resp = await fetch(assignModerationJobUrl, {
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
  const approve = document.getElementById('approveBtn');
  const reject = document.getElementById('rejectBtn');
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

const fetchJson = async (url, init) => {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    const error = new Error(`HTTP ${resp.status}`);
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

export const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

initGoogleSignIn({
  onSignIn: () => {
    document.body.classList.add('authed');
    document
      .querySelectorAll('#signinButton')
      .forEach(el => (el.style.display = 'none'));
    document
      .querySelectorAll('#signoutWrap')
      .forEach(el => (el.style.display = ''));
    if (isAdmin()) {
      document
        .querySelectorAll('.admin-link')
        .forEach(link => (link.style.display = ''));
    }
    wireSignOut();
    loadVariant();
  },
});

if (getIdToken()) {
  document.body.classList.add('authed');
  document
    .querySelectorAll('#signinButton')
    .forEach(el => (el.style.display = 'none'));
  document
    .querySelectorAll('#signoutWrap')
    .forEach(el => (el.style.display = ''));
  if (isAdmin()) {
    document
      .querySelectorAll('.admin-link')
      .forEach(link => (link.style.display = ''));
  }
  wireSignOut();
  loadVariant();
}
