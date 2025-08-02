import { initGoogleSignIn, getIdToken } from './googleAuth.js';

initGoogleSignIn({
  onSignIn: () => {
    document.body.classList.add('authed');
    const button = document.querySelector('form button[type="submit"]');
    if (button) {
      button.disabled = false;
    }
  },
});

// attach once DOM is parsed
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('nextPageForm');
    const field = document.getElementById('idTokenField');

    form.addEventListener('submit', () => {
      const token = getIdToken();
      if (!token) {
        alert('Please sign in first');
        throw new Error('id_token missing');
      }
      field.value = token; // 🔑 travels in the POST body
    });
  });
}

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
