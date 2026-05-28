import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { createGoogleAuthModule, isAdminWithDeps, setupFirebase } from './admin-core.js';
import { getIdToken } from '../core/browser/browser-core.js';

setupFirebase(initializeApp);

export const { initGoogleSignIn, signOut } = createGoogleAuthModule({
  getAuthFn: getAuth,
  storage: sessionStorage,
  consoleObj: console,
  globalScope: globalThis,
  Provider: GoogleAuthProvider,
  credentialFactory: signInWithCredential,
});

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

export { isAdmin };
export { getIdToken };
