import crypto from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { LIST_ITEM_HTML, PAGE_HTML } from './htmlSnippets.js';

initializeApp();
const db = getFirestore();
const storage = new Storage();
const auth = getAuth();
const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const URL_MAP = process.env.URL_MAP || 'prod-dendrite-url-map';
const CDN_HOST = process.env.CDN_HOST || 'www.dendritestories.co.nz';

/**
 * Escape HTML special characters.
 * @param {string} text Text to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build the index HTML page.
 * @param {Array<{title: string, pageNumber: number}>} items Story items.
 * @returns {string} HTML page.
 */
function buildHtml(items) {
  const list = items
    .map(item => LIST_ITEM_HTML(item.pageNumber, escapeHtml(item.title)))
    .join('');
  return PAGE_HTML(list);
}

/**
 * Retrieve an access token from the metadata server.
 * @returns {Promise<string>} Access token.
 */
async function getAccessTokenFromMetadata() {
  const r = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!r.ok) throw new Error(`metadata token: HTTP ${r.status}`);
  const { access_token } = await r.json();
  return access_token;
}

/**
 * Invalidate CDN caches for the specified paths.
 * @param {string[]} paths Paths to invalidate.
 */
async function invalidatePaths(paths) {
  const token = await getAccessTokenFromMetadata();
  await Promise.all(
    paths.map(async path => {
      try {
        const res = await fetch(
          `https://compute.googleapis.com/compute/v1/projects/${PROJECT}/global/urlMaps/${URL_MAP}/invalidateCache`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: CDN_HOST,
              path,
              requestId: crypto.randomUUID(),
            }),
          }
        );
        if (!res.ok) {
          console.error(`invalidate ${path} failed: ${res.status}`);
        }
      } catch (e) {
        console.error(`invalidate ${path} error`, e?.message || e);
      }
    })
  );
}

/**
 * Get the top story statistics by variant count.
 * @returns {Promise<Array<string>>} Story IDs ordered by variant count.
 */
async function fetchTopStoryIds() {
  const snapshot = await db
    .collection('storyStats')
    .orderBy('variantCount', 'desc')
    .limit(1000)
    .get();
  return snapshot.docs.map(doc => doc.id);
}

/**
 * Fetch title and page number for a story.
 * @param {string} storyId Story identifier.
 * @returns {Promise<{title: string, pageNumber: number}|null>} Story info or null.
 */
async function fetchStoryInfo(storyId) {
  const storySnap = await db.collection('stories').doc(storyId).get();
  if (!storySnap.exists) {
    return null;
  }
  const story = storySnap.data();
  const rootRef = story.rootPage;
  if (!rootRef) {
    return null;
  }
  const pageSnap = await rootRef.get();
  if (!pageSnap.exists) {
    return null;
  }
  const page = pageSnap.data();
  return { title: story.title || '', pageNumber: page.number };
}

/**
 * Generate contents pages and invalidate caches.
 * @param {{fetchTopStoryIds?: () => Promise<Array<string>>, fetchStoryInfo?: (id: string) => Promise<{title: string, pageNumber: number}|null>}} deps Optional dependencies for testing.
 */
async function render(deps = {}) {
  const {
    fetchTopStoryIds: fetchIds = fetchTopStoryIds,
    fetchStoryInfo: fetchInfo = fetchStoryInfo,
  } = deps;
  const ids = await fetchIds();
  const items = [];
  for (const id of ids) {
    const info = await fetchInfo(id);
    if (info) {
      items.push(info);
    }
  }
  const pageSize = 30;
  const bucket = storage.bucket('www.dendritestories.co.nz');
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paths = [];
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const html = buildHtml(pageItems);
    const filePath = page === 1 ? 'index.html' : `contents/${page}.html`;
    const options = { contentType: 'text/html' };
    if (page === totalPages) {
      options.metadata = { cacheControl: 'no-cache' };
    }
    await bucket.file(filePath).save(html, options);
    paths.push(`/${filePath}`);
  }
  await invalidatePaths(paths);
  return null;
}

/**
 * Validate request origin and method.
 * @param {import('express').Request} req HTTP request
 * @param {import('express').Response} res HTTP response
 * @returns {boolean} True if request is valid
 */
function validateRequest(req, res) {
  const origin = req.get('Origin');
  if (!origin || allowed.includes(origin)) {
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.status(403).send('CORS');
    return false;
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    res.status(204).send('');
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return false;
  }
  return true;
}

/**
 *
 * @param req
 * @param res
 * @param deps
 */
async function handleRenderRequest(req, res, deps = {}) {
  if (!validateRequest(req, res)) {
    return;
  }
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).send('Missing token');
    return;
  }
  let decoded;
  try {
    decoded = await auth.verifyIdToken(match[1]);
  } catch (e) {
    res.status(401).send(e?.message || 'Invalid token');
    return;
  }
  if (decoded.uid !== ADMIN_UID) {
    res.status(403).send('Forbidden');
    return;
  }
  const renderFn = deps.renderFn || render;
  try {
    await renderFn();
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'render failed' });
  }
}

/**
 * Cloud Function triggered when a new story is created.
 */
export const renderContents = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}')
  .onCreate(render);
export const triggerRenderContents = functions
  .region('europe-west1')
  .https.onRequest(handleRenderRequest);

export {
  buildHtml,
  fetchTopStoryIds,
  fetchStoryInfo,
  render,
  handleRenderRequest,
};
