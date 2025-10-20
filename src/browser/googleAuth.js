import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createInitGoogleSignIn } from './admin-core.js';
import { ADMIN_UID } from './admin-config.js';

initializeApp({
  apiKey: 'AIzaSyDRc1CakoDi6airj7t7DgY4KDSlxNwKIIQ',
  authDomain: 'irien-465710.firebaseapp.com',
  projectId: 'irien-465710',
});

const auth = getAuth();

export const initGoogleSignIn = createInitGoogleSignIn({
  googleAccountsId: () => window.google?.accounts?.id,
  credentialFactory: GoogleAuthProvider.credential,
  signInWithCredential,
  auth,
  storage: sessionStorage,
  matchMedia: query => window.matchMedia(query),
  querySelectorAll: selector => document.querySelectorAll(selector),
  logger: console,
});

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
