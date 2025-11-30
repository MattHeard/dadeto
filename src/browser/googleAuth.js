import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleAuthModule } from './admin-core.js';

export const { initGoogleSignIn, signOut } = createGoogleAuthModule({
  getAuthFn: getAuth,
  storage: sessionStorage,
  consoleObj: console,
  globalScope: globalThis,
  Provider: GoogleAuthProvider,
  credentialFactory: signInWithCredential,
});
