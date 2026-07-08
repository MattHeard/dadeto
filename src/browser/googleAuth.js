import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  createGoogleAuthModule,
  isAdminWithDeps,
  setupFirebase,
} from '../core/browser/admin-core.js';
import { createLoadStaticConfig } from '../core/browser/load-static-config-core.js';
import {
  getCachedAuthorUuid,
  installAuthorUuidCaching,
  setCachedAuthorUuid,
} from '../core/browser/google-auth-cache.js';
import { getIdToken } from '../core/browser/browser-core.js';

setupFirebase(initializeApp);
const handle = installAuthorUuidCaching(
  createGoogleAuthModule({
    getAuthFn: getAuth,
    storage: sessionStorage,
    consoleObj: console,
    globalScope: globalThis,
    Provider: GoogleAuthProvider,
    credentialFactory: signInWithCredential,
  }),
  {
    fetchFn: globalThis.fetch.bind(globalThis),
    getAuthorUuidUrl: createLoadStaticConfig({
      fetchFn: globalThis.fetch.bind(globalThis),
      warn: console.warn.bind(console),
    })().then(config => config.getAuthorUuidUrl || ''),
    isInternalOrigin: () =>
      /^10\.132\.0\.\d+$/.test(globalThis?.location?.hostname || ''),
  }
);

export { handle };
export const initGoogleSignIn = handle.initGoogleSignIn;
export async function signOut() { await handle.signOut(); setCachedAuthorUuid(sessionStorage, null); }
export const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);
export const getAuthorUuid = () => getCachedAuthorUuid(sessionStorage);
export { getIdToken };
