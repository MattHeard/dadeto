import { initGoogleSignIn, signOut } from './googleAuth.js';
import { getIdToken } from '../core/browser/browser-core.js';
import { isAdminWithDeps } from './admin-core.js';

const isAdmin = () => isAdminWithDeps(sessionStorage, JSON, atob);

const signInButtons = document.querySelectorAll('#signinButton');
const signOutWraps = document.querySelectorAll('#signoutWrap');
const signOutLinks = document.querySelectorAll('#signoutLink');
const adminLinks = document.querySelectorAll('.admin-link');

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

initGoogleSignIn({
  onSignIn: showSignedIn,
});

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
