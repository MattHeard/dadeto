import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import {
  createAdminEndpointsPromise,
  getStatusParagraph,
  createCheckAccess,
  createTriggerRender,
  createTriggerStats,
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

/**
 * Submit page/variant to trigger regeneration.
 * @param {Event} e Submit event.
 */
async function regenerateVariant(e) {
  e.preventDefault();
  const token = getIdToken();
  if (!token) {
    return;
  }
  const input = document.getElementById('regenInput');
  const value = input?.value.trim();
  const match = value.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) {
    showMessage('Invalid format');
    return;
  }
  const page = Number(match[1]);
  const variant = match[2];
  try {
    const { markVariantDirtyUrl } = await getAdminEndpoints();
    const res = await fetch(markVariantDirtyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page, variant }),
    });
    if (!res.ok) throw new Error('fail');
    showMessage('Regeneration triggered');
  } catch {
    showMessage('Regeneration failed');
  }
}

document.getElementById('renderBtn')?.addEventListener('click', triggerRender);
document.getElementById('statsBtn')?.addEventListener('click', triggerStats);
document
  .getElementById('regenForm')
  ?.addEventListener('submit', regenerateVariant);

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
