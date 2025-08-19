import { initGoogleSignIn, getIdToken } from './googleAuth.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const RENDER_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents';
const REGENERATE_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty';

/**
 * Redirects unauthorized users and reveals admin content for the correct UID.
 */
function checkAccess() {
  const user = getAuth().currentUser;
  if (!user || user.uid !== ADMIN_UID) {
    window.location.href = '/index.html';
    return;
  }
  const content = document.getElementById('adminContent');
  const signin = document.getElementById('signinButton');
  if (content) content.style.display = '';
  if (signin) signin.style.display = 'none';
}

/**
 *
 */
async function triggerRender() {
  const token = getIdToken();
  if (!token) {
    return;
  }
  try {
    await fetch(RENDER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    alert('Render triggered');
  } catch {
    alert('Render failed');
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
    alert('Invalid format');
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
    alert('Regeneration triggered');
  } catch {
    alert('Regeneration failed');
  }
}

document.getElementById('renderBtn')?.addEventListener('click', triggerRender);
document
  .getElementById('regenForm')
  ?.addEventListener('submit', regenerateVariant);

initGoogleSignIn({ onSignIn: checkAccess });

if (getIdToken()) {
  checkAccess();
}
