import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  createInitGoogleSignInHandlerFactory,
  createSignOutHandlerFactory,
} from './admin-core.js';

/**
 *
 * @param authGetter
 * @param sessionStorageObj
 * @param consoleObj
 * @param globalScope
 * @param Provider
 * @param credentialFactory
 */
function createGoogleAuthModule(
  authGetter,
  sessionStorageObj,
  consoleObj,
  globalScope,
  Provider,
  credentialFactory
) {
  const getInitGoogleSignInHandler = createInitGoogleSignInHandlerFactory(
    authGetter,
    sessionStorageObj,
    consoleObj,
    globalScope,
    Provider,
    credentialFactory
  );

  const initGoogleSignIn = options => getInitGoogleSignInHandler()(options);

  const getSignOutHandler = createSignOutHandlerFactory(
    authGetter,
    globalScope
  );

  // Keep exporting the pre-configured sign-out helper for callers such as
  // `src/browser/moderate.js` that expect it to live on the googleAuth module.
  const signOut = () => getSignOutHandler()();

  return { initGoogleSignIn, signOut };
}

const googleAuth = createGoogleAuthModule(
  getAuth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);

export const { initGoogleSignIn, signOut } = googleAuth;
