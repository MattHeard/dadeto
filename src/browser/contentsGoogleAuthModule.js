import { createGoogleAuthStatusHandle } from '../core/browser/google-auth-status.js';
import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
} from '../core/browser/error-beacon.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const errorBeaconUrlPromise = loadStaticConfig()
  .then(config => config.errorBeaconUrl || '')
  .catch(() => '');

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: initGoogleSignIn,
  signOutFn: signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

const errorBeaconHandlers = createErrorBeaconHandlers({
  reportBeacon: payload =>
    errorBeaconUrlPromise.then(url => {
      if (!url) {
        return;
      }

      createErrorBeaconReporter(
        globalThis.navigator?.sendBeacon?.bind(globalThis.navigator),
        url
      )(payload);
    }),
  getUrl: () => globalThis.location?.href ?? '',
  getUserAgent: () => globalThis.navigator?.userAgent ?? '',
  getNow: () => Date.now(),
  logError: console.error.bind(console),
});

globalThis.addEventListener('error', errorBeaconHandlers.handleWindowError);
globalThis.addEventListener('unhandledrejection', errorBeaconHandlers.handleUnhandledRejection);

handle();
