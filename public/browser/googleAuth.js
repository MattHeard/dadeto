import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleSignOut } from './browser-core.js';
import {
  createDisableAutoSelect,
  createGoogleSignInInit,
  createSessionStorageHandler,
  setupFirebase,
} from './admin-core.js';

setupFirebase(initializeApp);

const auth = getAuth();

export const initGoogleSignIn = createGoogleSignInInit(
  auth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);

// Keep exporting the pre-configured sign-out helper for callers such as
// `src/browser/moderate.js` that expect it to live on the googleAuth module.
export const signOut = createGoogleSignOut({
  authSignOut: auth.signOut.bind(auth),
  storage: createSessionStorageHandler(globalThis),
  disableAutoSelect: createDisableAutoSelect(globalThis),
});
