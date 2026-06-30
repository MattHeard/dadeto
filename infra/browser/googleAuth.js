import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { createGoogleAuthModule } from './admin-core.js';

const googleAuthModule = createGoogleAuthModule({
  getAuthFn: getAuth,
  storage: sessionStorage,
  consoleObj: console,
  globalScope: globalThis,
  Provider: GoogleAuthProvider,
  credentialFactory: signInWithCredential,
});

function isInternalPlaywrightOrigin(globalScope) {
  const hostname = globalScope?.location?.hostname;
  return typeof hostname === 'string' && /^10\.132\.0\.\d+$/.test(hostname);
}

export const initGoogleSignIn = async options => {
  if (isInternalPlaywrightOrigin(globalThis)) {
    return;
  }

  return googleAuthModule.initGoogleSignIn(options);
};

export const { signOut } = googleAuthModule;
