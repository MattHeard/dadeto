import { loadStaticConfig } from './loadStaticConfig.js';
import { initAdminApp } from '../core/browser/admin-core.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';

initAdminApp({
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
});
