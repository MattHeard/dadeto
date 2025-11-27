import { loadStaticConfig } from './loadStaticConfig.js';
import { initAdminApp } from '../core/browser/admin-core.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';

initAdminApp(
  loadStaticConfig,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  initializeApp,
  sessionStorage,
  console,
  globalThis,
  document,
  fetch
);
