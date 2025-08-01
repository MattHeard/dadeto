export const initGoogleSignIn = ({ onSignIn } = {}) => {
  if (!window.google || !google.accounts?.id) {
    console.error('Google Identity script missing');
    return;
  }

  google.accounts.id.initialize({
    client_id:
      '848377461162-7je7r4pg7mnaj85gq558cf4gt0mk8j9b.apps.googleusercontent.com',
    callback: ({ credential }) => {
      sessionStorage.setItem('id_token', credential);
      onSignIn?.(credential);
    },
  });

  google.accounts.id.renderButton(document.getElementById('signinButton'), {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
  });
};

export const getIdToken = () => sessionStorage.getItem('id_token');

export const signOut = () => {
  sessionStorage.removeItem('id_token');
  google.accounts.id.disableAutoSelect();
};
