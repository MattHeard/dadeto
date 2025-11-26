import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createSignOut, createGoogleSignInInit } from './admin-core.js';

let initGoogleSignInHandler;
const getInitGoogleSignInHandler = () => {
  if (!initGoogleSignInHandler) {
    const auth = getAuth();
    initGoogleSignInHandler = createGoogleSignInInit(
      auth,
      sessionStorage,
      console,
      globalThis,
      GoogleAuthProvider,
      signInWithCredential
    );
  }
  return initGoogleSignInHandler;
};

export const initGoogleSignIn = options =>
  getInitGoogleSignInHandler()(options);

let signOutHandler;
const getSignOutHandler = () => {
  if (!signOutHandler) {
    const auth = getAuth();
    signOutHandler = createSignOut(auth, globalThis);
  }
  return signOutHandler;
};

export const signOut = () => getSignOutHandler()();
