import { createGoogleAuthStatusHandle } from '../core/browser/google-auth-status.js';
import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
} from '../core/browser/error-beacon.js';
import { initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const errorBeaconHandlers = createErrorBeaconHandlers({
  reportBeacon: createErrorBeaconReporter(
    globalThis.navigator?.sendBeacon?.bind(globalThis.navigator),
    '/errors'
  ),
  getUrl: () => globalThis.location?.href ?? '',
  getUserAgent: () => globalThis.navigator?.userAgent ?? '',
  getNow: () => Date.now(),
  logError: console.error.bind(console),
});

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: initGoogleSignIn,
  signOutFn: signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

globalThis.addEventListener('error', errorBeaconHandlers.handleWindowError);
globalThis.addEventListener(
  'unhandledrejection',
  errorBeaconHandlers.handleUnhandledRejection
);

handle();
