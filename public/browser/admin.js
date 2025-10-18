import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import {
  mapConfigToAdminEndpoints,
  getDefaultAdminEndpointsCopy,
  getStatusParagraph,
  getCurrentUser,
  getAdminContent,
  getSignInButtons,
  getSignOutSections,
  updateAuthControlsDisplay,
} from './admin-core.js';
import {
  getAuth,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
let adminEndpointsPromise;

/**
 * Build the admin endpoints promise using the static configuration fallback.
 * @returns {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>}
 */
function createAdminEndpointsPromise() {
  return loadStaticConfig()
    .then(mapConfigToAdminEndpoints)
    .catch(getDefaultAdminEndpointsCopy);
}

/**
 * Resolve admin endpoints from the static config with production fallbacks.
 * @returns {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>}
 */
async function getAdminEndpoints() {
  if (!adminEndpointsPromise) {
    adminEndpointsPromise = createAdminEndpointsPromise();
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

/**
 * Reveals admin content for the correct UID and hides it otherwise without
 * redirecting.
 */
function checkAccess() {
  const user = getCurrentUser(getAuth);
  const content = getAdminContent(document);
  const signins = getSignInButtons(document);
  const signouts = getSignOutSections(document);
  updateAuthControlsDisplay(user, signins, signouts);
  if (!user || user.uid !== ADMIN_UID) {
    if (content) content.style.display = 'none';
    return;
  }
  if (content) content.style.display = '';
}

/**
 *
 */
async function triggerRender() {
  const token = getIdToken();
  if (!token) {
    showMessage('Render failed: missing ID token');
    return;
  }
  try {
    const { triggerRenderContentsUrl } = await getAdminEndpoints();
    const res = await fetch(triggerRenderContentsUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      showMessage(
        `Render failed: ${res.status} ${res.statusText}${
          body ? ` - ${body}` : ''
        }`
      );
      return;
    }
    showMessage('Render triggered');
  } catch (e) {
    showMessage(`Render failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Trigger stats generation.
 */
async function triggerStats() {
  const token = getIdToken();
  if (!token) {
    return;
  }
  try {
    const { generateStatsUrl } = await getAdminEndpoints();
    await fetch(generateStatsUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    showMessage('Stats generated');
  } catch {
    showMessage('Stats generation failed');
  }
}

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
