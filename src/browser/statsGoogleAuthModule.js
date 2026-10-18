import { GOOGLE_AUTH_STATUS_ASSET_VERSION } from '../core/google-auth-status-asset-version.js';
import { getAuthorUuid, initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const statusModuleUrl = new URL('../core/browser/google-auth-status.js',
  import.meta.url
);
statusModuleUrl.searchParams.set('v', GOOGLE_AUTH_STATUS_ASSET_VERSION);
const { createGoogleAuthStatusHandle } = await import(statusModuleUrl.href);

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: initGoogleSignIn,
  getAuthorUuidFn: getAuthorUuid,
  signOutFn: signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

handle();
