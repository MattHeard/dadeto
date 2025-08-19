import crypto from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

initializeApp();
const db = getFirestore();
const auth = getAuth();
const storage = new Storage();

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const URL_MAP = process.env.URL_MAP || 'prod-dendrite-url-map';
const CDN_HOST = process.env.CDN_HOST || 'www.dendritestories.co.nz';
const BUCKET = 'www.dendritestories.co.nz';

const app = express();
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods: ['POST'],
  })
);

/**
 * Build stats HTML page.
 * @param {number} storyCount Story count.
 * @param {number} pageCount Page count.
 * @param {number} unmoderatedCount Unmoderated page count.
 * @returns {string} HTML page.
 */
function buildHtml(storyCount, pageCount, unmoderatedCount) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite stats</title><link rel="stylesheet" href="/dendrite.css" /></head><body><header class="header"><nav class="nav"><a href="/"><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em" />Dendrite</a><a href="new-story.html">New story</a><a href="mod.html">Moderate</a><a href="stats.html">Stats</a><div id="signinButton"></div></nav></header><main><h1>Stats</h1><p>Number of stories: ${storyCount}</p><p>Number of pages: ${pageCount}</p><p>Number of unmoderated pages: ${unmoderatedCount}</p></main><script src="https://accounts.google.com/gsi/client" defer></script><script type="module">import { initGoogleSignIn } from './googleAuth.js'; initGoogleSignIn();</script></body></html>`;
}

/**
 * Count stories in Firestore.
 * @returns {Promise<number>} Story count.
 */
async function getStoryCount() {
  const snap = await db.collection('stories').count().get();
  return snap.data().count || 0;
}

/**
 * Count pages in Firestore.
 * @param {import('firebase-admin/firestore').Firestore} [dbRef] Firestore instance.
 * @returns {Promise<number>} Page count.
 */
async function getPageCount(dbRef = db) {
  const snap = await dbRef.collection('pages').count().get();
  return snap.data().count || 0;
}

/**
 * Count pages without moderator reputation.
 * @param {import('firebase-admin/firestore').Firestore} [dbRef] Firestore instance.
 * @returns {Promise<number>} Unmoderated page count.
 */
async function getUnmoderatedPageCount(dbRef = db) {
  const zeroSnap = await dbRef
    .collection('pages')
    .where('moderatorReputationSum', '==', 0)
    .count()
    .get();
  const nullSnap = await dbRef
    .collection('pages')
    .where('moderatorReputationSum', '==', null)
    .count()
    .get();
  return (zeroSnap.data().count || 0) + (nullSnap.data().count || 0);
}

/**
 * Retrieve access token from metadata server.
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
 * Invalidate CDN caches for given paths.
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
 * Generate stats page and upload to storage.
 * @param {{
 *   storyCountFn?: () => Promise<number>,
 *   pageCountFn?: () => Promise<number>,
 *   unmoderatedPageCountFn?: () => Promise<number>,
 *   storageInstance?: Storage,
 * }} [deps] Optional dependencies.
 */
async function generate(deps = {}) {
  const storyCountFn = deps.storyCountFn || getStoryCount;
  const pageCountFn = deps.pageCountFn || getPageCount;
  const unmoderatedPageCountFn =
    deps.unmoderatedPageCountFn || getUnmoderatedPageCount;
  const [storyCount, pageCount, unmoderatedCount] = await Promise.all([
    storyCountFn(),
    pageCountFn(),
    unmoderatedPageCountFn(),
  ]);
  const html = buildHtml(storyCount, pageCount, unmoderatedCount);
  const bucket = (deps.storageInstance || storage).bucket(BUCKET);
  await bucket.file('stats.html').save(html, {
    contentType: 'text/html',
    metadata: { cacheControl: 'no-cache' },
  });
  await invalidatePaths(['/stats.html']);
  return null;
}

/**
 * Handle HTTP requests to generate stats.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @param {{genFn?: typeof generate}} [deps] Optional dependencies.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleRequest(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }
  const isCron = req.get('X-Appengine-Cron') === 'true';
  if (!isCron) {
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
  }
  const genFn = deps.genFn || generate;
  try {
    await genFn();
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'generate failed' });
  }
}

app.post('/', handleRequest);

export const generateStats = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  buildHtml,
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  generate,
  handleRequest,
};
