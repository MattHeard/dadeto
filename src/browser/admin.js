import { loadStaticConfig } from './loadStaticConfig.js';
import { createInitAdminAppHandle } from '../core/browser/admin-core.js';
import {
  createErrorBeaconHandlers,
  createErrorBeaconSendBeaconReporter,
} from '../core/browser/error-beacon.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';

const errorBeaconHandlers = createErrorBeaconHandlers({
  reportBeacon: createErrorBeaconSendBeaconReporter(
    globalThis.navigator?.sendBeacon?.bind(globalThis.navigator),
    '/prod-errors'
  ),
  getUrl: () => globalThis.location?.href ?? '',
  getNow: () => Date.now(),
  logError: console.error.bind(console),
});

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
  fetchObj: fetch,
  reportError: errorBeaconHandlers.logError,
});

handle();
