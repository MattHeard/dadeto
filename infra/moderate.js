import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';

initGoogleSignIn({
  onSignIn: () => {
    document.body.classList.add('authed');
    const button = document.querySelector('form button[type="submit"]');
    if (button) {
      button.disabled = false;
    }
    const signin = document.getElementById('signinButton');
    const wrap = document.getElementById('signoutWrap');
    signin.style.display = 'none';
    wrap.style.display = '';
    wrap.querySelector('#signoutBtn').onclick = () => {
      signOut();
      wrap.style.display = 'none';
      signin.style.display = '';
      if (button) {
        button.disabled = true;
      }
      document.body.classList.remove('authed');
    };
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

if (getIdToken()) {
  document.body.classList.add('authed');
  document.getElementById('signinButton').style.display = 'none';
  document.getElementById('signoutWrap').style.display = '';
  const button = document.querySelector('form button[type="submit"]');
  if (button) {
    button.disabled = false;
  }
}
