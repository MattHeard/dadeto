import { loadStaticConfig } from './loadStaticConfig.js';
import {
  createGoogleSignInInit,
  createSignOut,
  initAdmin,
  setupFirebase,
} from './admin-core.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getIdToken } from '../core/browser/browser-core.js';

((
  loadStaticConfigFn,
  getAuthFn,
  GoogleAuthProviderFn,
  onAuthStateChangedFn,
  signInWithCredentialFn,
  initializeAppFn
) => {
  setupFirebase(initializeAppFn);

  let initGoogleSignInHandler;
  const getInitGoogleSignInHandler = () => {
    if (!initGoogleSignInHandler) {
      const auth = getAuthFn();
      initGoogleSignInHandler = createGoogleSignInInit(
        auth,
        sessionStorage,
        console,
        globalThis,
        GoogleAuthProviderFn,
        signInWithCredentialFn
      );
    }
    return initGoogleSignInHandler;
  };

  const initGoogleSignIn = options => getInitGoogleSignInHandler()(options);

  let signOutHandler;
  const getSignOutHandler = () => {
    if (!signOutHandler) {
      const auth = getAuthFn();
      signOutHandler = createSignOut(auth, globalThis);
    }
    return signOutHandler;
  };

  const signOut = () => getSignOutHandler()();

  const googleAuth = {
    initGoogleSignIn,
    signOut,
    getIdToken,
  };

  initAdmin({
    googleAuthModule: googleAuth,
    loadStaticConfigFn: loadStaticConfigFn,
    getAuthFn: getAuthFn,
    onAuthStateChangedFn: onAuthStateChangedFn,
    doc: document,
    fetchFn: fetch,
  });
})(
  loadStaticConfig,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  initializeApp
);
