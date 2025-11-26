import { initGoogleSignIn, signOut } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { initAdmin } from './admin-core.js';
import {
  getAuth,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

import { getIdToken } from '../core/browser/browser-core.js';

const googleAuth = {
  initGoogleSignIn,
  signOut,
  getIdToken,
};

initAdmin({
  googleAuthModule: googleAuth,
  loadStaticConfigFn: loadStaticConfig,
  getAuthFn: getAuth,
  onAuthStateChangedFn: onAuthStateChanged,
  doc: document,
  fetchFn: fetch,
});
