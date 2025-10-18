import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import {
  createAdminEndpointsPromise,
  getStatusParagraph,
  createCheckAccess,
  createTriggerRender,
  createTriggerStats,
  createRegenerateVariant,
  bindTriggerRenderClick,
  bindTriggerStatsClick,
  bindRegenerateVariantSubmit,
} from './admin-core.js';
import {
  getAuth,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

let adminEndpointsPromise;

/**
 * Resolve admin endpoints from the static config with production fallbacks.
 * @returns {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>}
 */
async function getAdminEndpoints() {
  if (!adminEndpointsPromise) {
    adminEndpointsPromise = createAdminEndpointsPromise(loadStaticConfig);
  }
  return adminEndpointsPromise;
}
const statusParagraph = getStatusParagraph(document);

/**
 * Display a status message on the admin page.
 * @param {string} text - Message to show.
 */
function showMessage(text) {
  if (statusParagraph) {
    statusParagraph.innerHTML = `<strong>${text}</strong>`;
  }
}

const checkAccess = createCheckAccess(getAuth, document);

/**
 * Trigger render when initiated from the admin UI.
 */
const triggerRender = createTriggerRender(
  getIdToken,
  getAdminEndpoints,
  fetch,
  showMessage
);

/**
 * Trigger stats generation when initiated from the admin UI.
 */
const triggerStats = createTriggerStats(
  getIdToken,
  getAdminEndpoints,
  fetch,
  showMessage
);

const regenerateVariant = createRegenerateVariant(
  getIdToken,
  document,
  showMessage,
  getAdminEndpoints,
  fetch
);

bindTriggerRenderClick(document, triggerRender);
bindTriggerStatsClick(document, triggerStats);
bindRegenerateVariantSubmit(document, regenerateVariant);

/**
 *
 */
function wireSignOut() {
  document.querySelectorAll('#signoutLink').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      await signOut();
    });
  });
}

wireSignOut();
onAuthStateChanged(getAuth(), checkAccess);
initGoogleSignIn();
