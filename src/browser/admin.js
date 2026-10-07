import { loadStaticConfig } from './loadStaticConfig.js';
import { createInitAdminAppHandle } from '../core/browser/admin-core.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';
import {
  createBrowserErrorBeaconHandlers,
  createEffectSendBeaconReporter,
} from './effect-adapters.js';

const errorBeaconUrlPromise = loadStaticConfig()
  .then(config => config.errorBeaconUrl || '')
  .catch(() => '');
const errorBeaconHandlers = createBrowserErrorBeaconHandlers(
  createEffectSendBeaconReporter(errorBeaconUrlPromise, bindEffectBoundary)
);

const handle = createInitAdminAppHandle({
  loadStaticConfigFn: loadStaticConfig,
  getAuthFn: getAuth,
  GoogleAuthProviderFn: GoogleAuthProvider,
  onAuthStateChangedFn: onAuthStateChanged,
  signInWithCredentialFn: signInWithCredential,
  initializeAppFn: initializeApp,
  sessionStorageObj: sessionStorage,
  consoleObj: console,
  globalThisObj: globalThis,
  documentObj: document,
  fetchObj: createEffectFetchFn((input, init) => fetch(input, init)),
  bindEffectBoundary,
  reportError: errorBeaconHandlers.logError,
});
handle();
