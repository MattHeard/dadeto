import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  createGoogleAuthModule,
  isAdminWithDeps,
  setupFirebase,
} from '../core/browser/admin-core.js';
import { getIdToken } from '../core/browser/browser-core.js';

setupFirebase(initializeApp);

const handle = createGoogleAuthModule({
  getAuthFn: getAuth,
  storage: sessionStorage,
  consoleObj: console,
  globalScope: globalThis,
  Provider: GoogleAuthProvider,
  credentialFactory: signInWithCredential,
});

export { handle };
export const { initGoogleSignIn, signOut } = handle;

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

export { isAdmin };
export { getIdToken };
