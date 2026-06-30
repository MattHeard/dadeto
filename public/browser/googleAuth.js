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

function isInternalPlaywrightOrigin(globalScope) {
  const hostname = globalScope?.location?.hostname;
  return typeof hostname === 'string' && /^10\.132\.0\.\d+$/.test(hostname);
}

const originalInitGoogleSignIn = handle.initGoogleSignIn;
handle.initGoogleSignIn = options => {
  if (isInternalPlaywrightOrigin(globalThis)) {
    return;
  }

  return originalInitGoogleSignIn(options);
};

export { handle };
export const { initGoogleSignIn, signOut } = handle;

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

export { isAdmin };
export { getIdToken };
