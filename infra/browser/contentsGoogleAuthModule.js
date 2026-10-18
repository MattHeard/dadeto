import { GOOGLE_AUTH_STATUS_ASSET_VERSION } from '../core/google-auth-status-asset-version.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import * as googleAuth from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';
import { bindEffectBoundary } from './allow-effects.js';
import {
  createBrowserErrorBeaconHandlers,
  createEffectFetchBeaconReporter,
  installGlobalErrorBeaconListeners,
} from './effect-adapters.js';
const statusModuleUrl = new URL('../core/browser/google-auth-status.js',
  import.meta.url
);
statusModuleUrl.searchParams.set('v', GOOGLE_AUTH_STATUS_ASSET_VERSION);
const { createGoogleAuthStatusHandle } = await import(statusModuleUrl.href);
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
        ? googleAuth.initGoogleSignIn({
            ...options,
            reportError: errorBeaconHandlers.logError,
          })
        : undefined
    ),
  getAuthorUuidFn: googleAuth.getAuthorUuid,
  refreshAuthorUuidFn: googleAuth.refreshAuthorUuid,
  signOutFn: googleAuth.signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

handle();
