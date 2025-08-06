import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';

const GET_VARIANT_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-get-moderation-variant';
const ASSIGN_JOB_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-assign-moderation-job';
const SUBMIT_RATING_URL =
  'https://europe-west1-irien-465710.cloudfunctions.net/prod-submit-moderation-rating';

/**
 * Ask the back-end for a new moderation job.
 * Resolves when the function returns 201 Created.
 */
async function assignJob() {
  const token = getIdToken();
  if (!token) throw new Error('not signed in');

  const body = new URLSearchParams({ id_token: token });

  const resp = await fetch(ASSIGN_JOB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`assign job: HTTP ${resp.status}`);
}

/**
 * Load the current moderation variant and render it.
 * @returns {Promise<void>} Promise resolving when rendering is complete.
 */
async function loadVariant() {
  try {
    const data = await authedFetch(GET_VARIANT_URL);
    const container = document.getElementById('pageContent');
    container.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = data.title || '';
    const author = document.createElement('p');
    author.textContent = data.author ? `By ${data.author}` : '';
    const content = document.createElement('p');
    content.textContent = data.content || '';
    container.appendChild(title);
    container.appendChild(author);
    container.appendChild(content);
    if (Array.isArray(data.options) && data.options.length) {
      const list = document.createElement('ol');
      data.options.forEach(opt => {
        const li = document.createElement('li');
        li.textContent =
          opt.targetPageNumber !== undefined
            ? `${opt.content} (${opt.targetPageNumber})`
            : opt.content;
        list.appendChild(li);
      });
      container.appendChild(list);
    }
    const approve = document.getElementById('approveBtn');
    const reject = document.getElementById('rejectBtn');
    if (approve && reject) {
      approve.disabled = false;
      reject.disabled = false;
      approve.onclick = () => submitRating(true);
      reject.onclick = () => submitRating(false);
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 *
 * @param isApproved
 */
async function submitRating(isApproved) {
  const approve = document.getElementById('approveBtn');
  const reject = document.getElementById('rejectBtn');
  if (approve) approve.disabled = true;
  if (reject) reject.disabled = true;
  try {
    await authedFetch(SUBMIT_RATING_URL, {
      method: 'POST',
      body: JSON.stringify({ isApproved }),
    });
  } catch (err) {
    console.error(err);
    alert("Sorry, that didn't work. See console for details.");
  }
}

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
      const approve = document.getElementById('approveBtn');
      const reject = document.getElementById('rejectBtn');
      if (approve) approve.disabled = true;
      if (reject) reject.disabled = true;
      document.body.classList.remove('authed');
    };
    loadVariant();
  },
});

// attach once DOM is parsed
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('nextPageForm');
    const button = form.querySelector('#nextPageBtn');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      button.disabled = true;

      try {
        await assignJob();
        await loadVariant();
      } catch (err) {
        console.error(err);
        alert("Sorry, that didn't work. See console for details.");
      } finally {
        button.disabled = false;
      }
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
  loadVariant();
}
