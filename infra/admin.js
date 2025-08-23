import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const RENDER_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents';
const REGENERATE_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty';
const STATS_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-generate-stats';
const statusParagraph = document.getElementById('renderStatus');

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
  const user = getAuth().currentUser;
  const content = document.getElementById('adminContent');
  const signins = document.querySelectorAll('#signinButton');
  const signouts = document.querySelectorAll('#signoutWrap');
  if (!user || user.uid !== ADMIN_UID) {
    if (content) content.style.display = 'none';
    if (user) {
      signins.forEach(el => (el.style.display = 'none'));
      signouts.forEach(el => (el.style.display = ''));
    } else {
      signins.forEach(el => (el.style.display = ''));
      signouts.forEach(el => (el.style.display = 'none'));
    }
    return;
  }
  if (content) content.style.display = '';
  signins.forEach(el => (el.style.display = 'none'));
  signouts.forEach(el => (el.style.display = ''));
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
    const res = await fetch(RENDER_URL, {
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
    await fetch(STATS_URL, {
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
    const res = await fetch(REGENERATE_URL, {
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
      document
        .querySelectorAll('#signoutWrap')
        .forEach(el => (el.style.display = 'none'));
      document
        .querySelectorAll('#signinButton')
        .forEach(el => (el.style.display = ''));
    });
  });
}

initGoogleSignIn({
  onSignIn: () => {
    checkAccess();
    wireSignOut();
  },
});

if (getIdToken()) {
  checkAccess();
  wireSignOut();
}
