import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleAuthModule } from './admin-core.js';
export const {
  initGoogleSignIn,
  signOut,
} = createGoogleAuthModule(
  getAuth,
  sessionStorage,
  console,
  globalThis,
  GoogleAuthProvider,
  signInWithCredential
);
