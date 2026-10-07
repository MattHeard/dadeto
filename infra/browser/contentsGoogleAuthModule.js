import { createGoogleAuthStatusHandle } from '../core/browser/google-auth-status.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import {
  getAuthorUuid,
  initGoogleSignIn,
  refreshAuthorUuid,
  signOut,
} from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';
import { bindEffectBoundary } from './allow-effects.js';
import {
  createBrowserErrorBeaconHandlers,
  createEffectFetchBeaconReporter,
  installGlobalErrorBeaconListeners,
} from './effect-adapters.js';
const errorBeaconUrlPromise = loadStaticConfig()
  .then(config => config.errorBeaconUrl || '')
  .catch(() => '');

const errorBeaconHandlers = createBrowserErrorBeaconHandlers(
  createEffectFetchBeaconReporter(
    errorBeaconUrlPromise,
    bindEffectBoundary,
    (input, init) => globalThis.fetch(input, init)
  ),
  () => globalThis.navigator?.userAgent ?? ''
);
installGlobalErrorBeaconListeners(errorBeaconHandlers);

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: options =>
    loadStaticConfig().then(config =>
      config.disableGoogleSignIn !== true
        ? initGoogleSignIn({
            ...options,
            reportError: errorBeaconHandlers.logError,
          })
        : undefined
    ),
  getAuthorUuidFn: getAuthorUuid,
  refreshAuthorUuidFn: refreshAuthorUuid,
  signOutFn: signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

handle();
