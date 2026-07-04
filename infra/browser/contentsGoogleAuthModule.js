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

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

const signInButtons = document.querySelectorAll('#signinButton');
const signOutWraps = document.querySelectorAll('#signoutWrap');
const signOutLinks = document.querySelectorAll('#signoutLink');
const adminLinks = document.querySelectorAll('.admin-link');

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

/**
 *
 */
function showSignedIn() {
  signInButtons.forEach(el => (el.style.display = 'none'));
  signOutWraps.forEach(el => (el.style.display = ''));
  if (isAdmin()) adminLinks.forEach(el => (el.style.display = ''));
}

/**
 *
 */
function showSignedOut() {
  signInButtons.forEach(el => (el.style.display = ''));
  signOutWraps.forEach(el => (el.style.display = 'none'));
  adminLinks.forEach(el => (el.style.display = 'none'));
}

globalThis.addEventListener('error', errorBeaconHandlers.handleWindowError);
globalThis.addEventListener(
  'unhandledrejection',
  errorBeaconHandlers.handleUnhandledRejection
);

(async () => {
  const config = await loadStaticConfig();
  if (config.disableGoogleSignIn !== true) {
    initGoogleSignIn({
      onSignIn: showSignedIn,
    });
  }
})();

signOutLinks.forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    await signOut();
    showSignedOut();
  });
});

if (getIdToken()) {
  showSignedIn();
}
