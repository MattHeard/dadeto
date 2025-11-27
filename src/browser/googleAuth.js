import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  createSignOut,
  createInitGoogleSignInHandlerFactory,
} from './admin-core.js';

const getInitGoogleSignInHandler = createInitGoogleSignInHandlerFactory(
  getAuth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);

export const initGoogleSignIn = options =>
  getInitGoogleSignInHandler()(options);

const createSignOutHandlerFactory = (getAuthFn, globalThisObj) => {
  let signOutHandler;
  return () => {
    if (!signOutHandler) {
      const auth = getAuthFn();
      signOutHandler = createSignOut(auth, globalThisObj);
    }
    return signOutHandler;
  };
};

const getSignOutHandler = createSignOutHandlerFactory(getAuth, globalThis);

// Keep exporting the pre-configured sign-out helper for callers such as
// `src/browser/moderate.js` that expect it to live on the googleAuth module.
export const signOut = () => getSignOutHandler()();
