import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleSignOut, getIdToken } from './browser-core.js';
import {
  createGoogleSignInInit,
  createSessionStorageHandler,
  setupFirebase,
} from './admin-core.js';
import { ADMIN_UID } from './common-core.js';

setupFirebase(initializeApp);

const auth = getAuth();

const sessionStorageAdapter = createSessionStorageHandler(globalThis);

export const initGoogleSignIn = createGoogleSignInInit(
  auth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);

/**
 *
 * @param storage
 * @param jsonParser
 * @param decodeBase64
 */
export function isAdminWithDeps(storage, jsonParser, decodeBase64) {
  const token = getIdToken(storage);
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    const json = jsonParser.parse(
      decodeBase64(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return json.sub === ADMIN_UID;
  } catch {
    return false;
  }
}

export const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

// Keep exporting the pre-configured sign-out helper for callers such as
// `src/browser/moderate.js` that expect it to live on the googleAuth module.
export const signOut = createGoogleSignOut({
  authSignOut: auth.signOut.bind(auth),
  storage: sessionStorageAdapter,
  disableAutoSelect: () => {
    const disable = globalThis.google?.accounts?.id?.disableAutoSelect;
    if (typeof disable === 'function') {
      disable();
    }
  },
});
