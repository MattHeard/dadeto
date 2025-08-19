import { initGoogleSignIn, getIdToken } from './googleAuth.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const RENDER_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents';

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

document.getElementById('renderBtn')?.addEventListener('click', triggerRender);

initGoogleSignIn({ onSignIn: checkAccess });

if (getIdToken()) {
  checkAccess();
}
