import { initGoogleSignIn, getIdToken } from './googleAuth.js';

initGoogleSignIn({
  onSignIn: () => {
    document.body.classList.add('authed');
    const button = document.querySelector('button');
    if (button) {
      button.disabled = false;
    }
  },
});

export const authedFetch = async (url, opts = {}) => {
  const token = getIdToken();
  if (!token) throw new Error('not signed in');

  const resp = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
};
