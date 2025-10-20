import {
  initGoogleSignIn,
  getIdToken,
  signOut,
  isAdmin,
} from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { createAuthedFetch } from './authedFetch.js';

const DEFAULT_ENDPOINTS = {
  getModerationVariantUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-get-moderation-variant',
  assignModerationJobUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-assign-moderation-job',
  submitModerationRatingUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-submit-moderation-rating',
};

let endpointsPromise;

/**
 * Resolve moderation endpoints from the static config with production fallbacks.
 * @returns {Promise<{getModerationVariantUrl: string, assignModerationJobUrl: string, submitModerationRatingUrl: string}>}
 */
async function getModerationEndpoints() {
  if (!endpointsPromise) {
    endpointsPromise = loadStaticConfig()
      .then(config => ({
        getModerationVariantUrl:
          config?.getModerationVariantUrl ??
          DEFAULT_ENDPOINTS.getModerationVariantUrl,
        assignModerationJobUrl:
          config?.assignModerationJobUrl ??
          DEFAULT_ENDPOINTS.assignModerationJobUrl,
        submitModerationRatingUrl:
          config?.submitModerationRatingUrl ??
          DEFAULT_ENDPOINTS.submitModerationRatingUrl,
      }))
      .catch(() => ({ ...DEFAULT_ENDPOINTS }));
  }
  return endpointsPromise;
}

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
    const container = document.getElementById('pageContent');
    container.style.display = '';
    container.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = data.title || '';
    const author = document.createElement('p');
    author.textContent = data.author ? `By ${data.author}` : '';
    const content = document.createElement('p');
    content.textContent = data.content || '';
    container.appendChild(title);
    container.appendChild(author);
    container.appendChild(content);
    if (Array.isArray(data.options) && data.options.length) {
      const list = document.createElement('ol');
      data.options.forEach(opt => {
        const li = document.createElement('li');
        li.textContent =
          opt.targetPageNumber !== undefined
            ? `${opt.content} (${opt.targetPageNumber})`
            : opt.content;
        list.appendChild(li);
      });
      container.appendChild(list);
    }
    const approve = document.getElementById('approveBtn');
    const reject = document.getElementById('rejectBtn');
    if (approve && reject) {
      approve.disabled = false;
      reject.disabled = false;
      approve.onclick = () => submitRating(true);
      reject.onclick = () => submitRating(false);
    }
  } catch (err) {
    if (err.message.includes('HTTP 404') && !retried) {
      try {
        await assignJob();
        await loadVariant(true);
      } catch (innerErr) {
        console.error(innerErr);
      }
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
