import { initGoogleSignIn, getIdToken } from './googleAuth.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const nav = document.querySelector('.nav');
const menuButton = document.getElementById('menuButton');

menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  nav?.classList.toggle('open');
});

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const RENDER_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents';
const REGENERATE_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty';
const STATS_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-generate-stats';

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
    alert('Stats generated');
  } catch {
    alert('Stats generation failed');
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
document.getElementById('statsBtn')?.addEventListener('click', triggerStats);
document
  .getElementById('regenForm')
  ?.addEventListener('submit', regenerateVariant);

initGoogleSignIn({ onSignIn: checkAccess });

if (getIdToken()) {
  checkAccess();
}
