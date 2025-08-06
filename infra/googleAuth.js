import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

initializeApp({
  apiKey: 'AIzaSyDRc1CakoDi6airj7t7DgY4KDSlxNwKIIQ',
  authDomain: 'irien-465710.firebaseapp.com',
  projectId: 'irien-465710',
});

const auth = getAuth();

export const initGoogleSignIn = ({ onSignIn } = {}) => {
  if (!window.google || !google.accounts?.id) {
    console.error('Google Identity script missing');
    return;
  }

  google.accounts.id.initialize({
    client_id:
      '848377461162-7je7r4pg7mnaj85gq558cf4gt0mk8j9b.apps.googleusercontent.com',
    callback: async ({ credential }) => {
      const cred = GoogleAuthProvider.credential(credential);
      await signInWithCredential(auth, cred);
      const idToken = await auth.currentUser.getIdToken();
      sessionStorage.setItem('id_token', idToken);
      onSignIn?.(idToken);
    },
    ux_mode: 'popup',
  });

  google.accounts.id.renderButton(document.getElementById('signinButton'), {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
  });
};

export const getIdToken = () => sessionStorage.getItem('id_token');

export const signOut = async () => {
  await auth.signOut();
  sessionStorage.removeItem('id_token');
  google.accounts.id.disableAutoSelect();
};
