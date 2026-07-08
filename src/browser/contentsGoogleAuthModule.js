import { createGoogleAuthStatusHandle } from '../core/browser/google-auth-status.js';
import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
} from '../core/browser/error-beacon.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { getAuthorUuid, initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const errorBeaconUrlPromise = loadStaticConfig()
  .then(config => config.errorBeaconUrl || '')
  .catch(() => '');

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: initGoogleSignIn,
  getAuthorUuidFn: getAuthorUuid,
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
        globalThis.fetch?.bind(globalThis),
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
