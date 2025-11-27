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

/**
 *
 * @param loadStaticConfigFn
 * @param getAuthFn
 * @param GoogleAuthProviderFn
 * @param onAuthStateChangedFn
 * @param signInWithCredentialFn
 * @param initializeAppFn
 * @param sessionStorageObj
 * @param consoleObj
 * @param globalThisObj
 * @param documentObj
 * @param fetchObj
 */
function initAdminApp(
  loadStaticConfigFn,
  getAuthFn,
  GoogleAuthProviderFn,
  onAuthStateChangedFn,
  signInWithCredentialFn,
  initializeAppFn,
  sessionStorageObj,
  consoleObj,
  globalThisObj,
  documentObj,
  fetchObj
) {
  setupFirebase(initializeAppFn);

  let initGoogleSignInHandler;
  const getInitGoogleSignInHandler = () => {
    if (!initGoogleSignInHandler) {
      const auth = getAuthFn();
      initGoogleSignInHandler = createGoogleSignInInit(
        auth,
        sessionStorageObj,
        consoleObj,
        globalThisObj,
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
      signOutHandler = createSignOut(auth, globalThisObj);
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
    doc: documentObj,
    fetchFn: fetchObj,
  });
}

initAdminApp(
  loadStaticConfig,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  initializeApp,
  sessionStorage,
  console,
  globalThis,
  document,
  fetch
);
