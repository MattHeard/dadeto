import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleSignOut } from './browser-core.js';
import {
  buildGoogleSignInDeps,
  createInitGoogleSignIn,
  createSessionStorageHandler,
  setupFirebase,
} from './admin-core.js';
import { ADMIN_UID } from './common-core.js';

setupFirebase(initializeApp);

const auth = getAuth();

const sessionStorageAdapter = createSessionStorageHandler(globalThis);

/**
 *
 * @param authInstance
 * @param storage
 * @param logger
 * @param globalObject
 * @param authProvider
 * @param signInCredential
 */
export function createGoogleSignInInit(
  authInstance,
  storage,
  logger,
  globalObject,
  authProvider,
  signInCredential
) {
  return createInitGoogleSignIn(
    buildGoogleSignInDeps(
      authInstance,
      storage,
      logger,
      globalObject,
      authProvider,
      signInCredential
    )
  );
}

export const initGoogleSignIn = createGoogleSignInInit(
  auth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);

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
