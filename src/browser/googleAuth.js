import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

initializeApp({
  apiKey: 'AIzaSyDRc1CakoDi6airj7t7DgY4KDSlxNwKIIQ',
  authDomain: 'irien-465710.firebaseapp.com',
  projectId: 'irien-465710',
});

const auth = getAuth();

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

export const initGoogleSignIn = ({ onSignIn } = {}) => {
  if (!window.google || !google.accounts?.id) {
    console.error('Google Identity script missing');
    return;
  }

  google.accounts.id.initialize({
    client_id:
      '848377461162-rv51umkquokgoq0hsnp1g0nbmmrv7kl0.apps.googleusercontent.com',
    callback: async ({ credential }) => {
      const cred = GoogleAuthProvider.credential(credential);
      await signInWithCredential(auth, cred);
      const idToken = await auth.currentUser.getIdToken();
      sessionStorage.setItem('id_token', idToken);
      onSignIn?.(idToken);
    },
    ux_mode: 'popup',
  });

  const mql = window.matchMedia('(prefers-color-scheme: dark)');

  const renderButton = () => {
    document.querySelectorAll('#signinButton').forEach(el => {
      el.innerHTML = '';
      google.accounts.id.renderButton(el, {
        theme: mql.matches ? 'filled_black' : 'filled_blue',
        size: 'large',
        text: 'signin_with',
      });
    });
  };

  renderButton();
  mql.addEventListener('change', renderButton);
};

export const getIdToken = () => sessionStorage.getItem('id_token');

export const isAdmin = () => {
  const token = getIdToken();
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return json.sub === ADMIN_UID;
  } catch {
    return false;
  }
};

export const signOut = async () => {
  await auth.signOut();
  sessionStorage.removeItem('id_token');
  google.accounts.id.disableAutoSelect();
};
