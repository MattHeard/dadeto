import { createGoogleAuthStatusHandle } from '../core/browser/google-auth-status.js';
import { initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const handle = createGoogleAuthStatusHandle({
  documentObj: document,
  initGoogleSignInFn: initGoogleSignIn,
  signOutFn: signOut,
  getIdTokenFn: getIdToken,
  isAdminFn: () => isAdminWithDeps(sessionStorage, JSON, atob),
});

handle();
