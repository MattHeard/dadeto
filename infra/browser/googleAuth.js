import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { createGoogleAuthModule } from './admin-core.js';

const googleAuthModule = createGoogleAuthModule({
  getAuthFn: getAuth,
  storage: sessionStorage,
  consoleObj: console,
  globalScope: globalThis,
  Provider: GoogleAuthProvider,
  credentialFactory: signInWithCredential,
});

const shouldDisableGoogleSignIn = async () => {
  const config = await loadStaticConfig();
  return config.disableGoogleSignIn === true;
};

export const initGoogleSignIn = async options => {
  if (await shouldDisableGoogleSignIn()) {
    return;
  }

  return googleAuthModule.initGoogleSignIn(options);
};

export const { signOut } = googleAuthModule;
