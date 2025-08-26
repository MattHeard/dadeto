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
 * @param {Array<{title: string, variantCount: number}>} [topStories]
 *   Top stories by variant count.
 * @returns {string} HTML page.
 */
function buildHtml(storyCount, pageCount, unmoderatedCount, topStories = []) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dendrite stats</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/dendrite.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">
        <img src="/img/logo.png" alt="Dendrite logo" />
        Dendrite
      </a>

      <nav class="nav-inline" aria-label="Primary">
        <a href="/new-story.html">New story</a>
        <a href="/mod.html">Moderate</a>
        <a href="/stats.html">Stats</a>
        <div id="signinButton"></div>
        <div id="signoutWrap" style="display:none">
          <a id="signoutLink" href="#">Sign out</a>
        </div>
      </nav>

      <button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">☰</button>
    </header>

    <!-- Mobile menu -->
    <div id="mobile-menu" class="menu-overlay" hidden aria-hidden="true">
      <div class="menu-sheet" role="dialog" aria-modal="true">
        <button class="menu-close" aria-label="Close menu">✕</button>

        <nav class="menu-groups">
          <div class="menu-group">
            <h3>Write</h3>
            <a href="/new-story.html">New story</a>
          </div>

          <div class="menu-group">
            <h3>Moderation</h3>
            <a href="/mod.html">Moderate</a>
            <a href="/stats.html">Stats</a>
            <a id="adminLink" href="/admin.html" style="display:none">Admin</a>
          </div>

          <div class="menu-group">
            <h3>Account</h3>
            <div id="signinButton"></div>
            <div id="signoutWrap" style="display:none">
              <a id="signoutLink" href="#">Sign out</a>
            </div>
          </div>
        </nav>
      </div>
    </div>
    <main>
      <h1>Stats</h1>
      <p>Number of stories: ${storyCount}</p>
      <p>Number of pages: ${pageCount}</p>
      <p>Number of unmoderated pages: ${unmoderatedCount}</p>
      <div id="topStories"></div>
    </main>
    <script src="https://accounts.google.com/gsi/client" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-sankey@0.12/dist/d3-sankey.min.js"></script>
    <script type="module">
      import {
        initGoogleSignIn,
        getIdToken,
        isAdmin,
        signOut,
      } from './googleAuth.js';
      const al = document.getElementById('adminLink');
      const sbs = document.querySelectorAll('#signinButton');
      const sws = document.querySelectorAll('#signoutWrap');
      const sos = document.querySelectorAll('#signoutLink');
      function showSignedIn() {
        sbs.forEach(el => (el.style.display = 'none'));
        sws.forEach(el => (el.style.display = ''));
        if (al && isAdmin()) al.style.display = '';
      }
      function showSignedOut() {
        sbs.forEach(el => (el.style.display = ''));
        sws.forEach(el => (el.style.display = 'none'));
        if (al) al.style.display = 'none';
      }
      initGoogleSignIn({ onSignIn: showSignedIn });
      sos.forEach(link => {
        link.addEventListener('click', async e => {
          e.preventDefault();
          await signOut();
          showSignedOut();
        });
      });
      if (getIdToken()) {
        showSignedIn();
      }
    </script>
    <script>
      (function () {
        const data = ${JSON.stringify(topStories)};
        const root = document.getElementById("topStories");
        if (
          !root ||
          !Array.isArray(data) ||
          !data.length ||
          typeof d3 === "undefined" ||
          !d3.sankey
        ) {
          return;
        }

        // Build a simple one-to-many graph (top stories flowing downward)
        const nodes = [{ name: "Stories" }].concat(
          data.map(d => ({ name: d.title }))
        );
        const links = data.map((d, i) => ({
          source: 0,
          target: i + 1,
          value: d.variantCount,
        }));

        // Final SVG size after rotation
        const W = 720;
        const H = 240;

        // Run sankey in native orientation sized as (height, width)
        const sankey = d3
          .sankey()
          .nodeWidth(15)
          .nodePadding(10)
          .extent([
            [1, 1],
            [H - 1, W - 1],
          ]);

        const graph = sankey({
          nodes: nodes.map(d => ({ ...d })),
          links: links.map(d => ({ ...d })),
        });

        // Normal viewBox (W x H), rotate content 90° and flip horizontally
        const svg = d3
          .create("svg")
          .attr("viewBox", '0 0 ' + W + ' ' + H)
          .attr("width", W)
          .attr("height", H);

        const g = svg
          .append("g")
          .attr("transform", 'rotate(90) scale(-1,1)');

        // Links using standard horizontal generator before rotation
        g.append("g")
          .attr("fill", "none")
          .selectAll("path")
          .data(graph.links)
          .join("path")
          .attr("d", d3.sankeyLinkHorizontal())
          .attr("stroke", "var(--muted)")
          .attr("stroke-width", d => Math.max(1, d.width))
          .attr("stroke-linecap", "round")
          .attr("stroke-opacity", 0.6);

        // Nodes
        const node = g
          .append("g")
          .selectAll("g")
          .data(graph.nodes)
          .join("g");

        node
          .append("rect")
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("width", d => d.x1 - d.x0)
          .attr("height", d => d.y1 - d.y0)
          .attr("rx", 2)
          .attr("fill", "var(--link)");

        // Labels on the right side post-rotation (skip root node)
        node
          .filter(d => d.index !== 0)
          .append("text")
          .attr("x", d => d.x1 + 6)
          .attr("y", d => (d.y0 + d.y1) / 2)
          .attr("dy", "0.35em")
          .attr("font-size", 12)
          .attr("text-anchor", "start")
          .text(d => d.name);

        root.appendChild(svg.node());
      })();
    </script>
    <script>
      (function () {
        const toggle = document.querySelector('.menu-toggle');
        const overlay = document.getElementById('mobile-menu');
        if (!toggle || !overlay) return;
        const sheet = overlay.querySelector('.menu-sheet');
        const closeBtn = overlay.querySelector('.menu-close');

        function openMenu() {
          overlay.hidden = false;
          overlay.setAttribute('aria-hidden', 'false');
          toggle.setAttribute('aria-expanded', 'true');
          document.body.style.overflow = 'hidden';
          const first = sheet.querySelector('a,button,[tabindex="0"]');
          if (first) first.focus();
        }
        function closeMenu() {
          overlay.setAttribute('aria-hidden', 'true');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          setTimeout(() => (overlay.hidden = true), 180);
          toggle.focus();
        }
        toggle.addEventListener('click', () =>
          overlay.hidden ? openMenu() : closeMenu()
        );
        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', e => {
          if (e.target === overlay) closeMenu();
        });
        addEventListener('keydown', e => {
          if (e.key === 'Escape' && !overlay.hidden) closeMenu();
        });
      })();
    </script>
  </body>
</html>`;
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
  const snap = await dbRef.collectionGroup('pages').count().get();
  return snap.data().count || 0;
}

/**
 * Count pages without moderator reputation.
 * @param {import('firebase-admin/firestore').Firestore} [dbRef] Firestore instance.
 * @returns {Promise<number>} Unmoderated page count.
 */
async function getUnmoderatedPageCount(dbRef = db) {
  const zeroSnap = await dbRef
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .count()
    .get();
  const nullSnap = await dbRef
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', null)
    .count()
    .get();
  return (zeroSnap.data().count || 0) + (nullSnap.data().count || 0);
}

/**
 * Get top stories by variant count.
 * @param {import('firebase-admin/firestore').Firestore} [dbRef] Firestore instance.
 * @param {number} [limit] Max number of stories.
 * @returns {Promise<Array<{title: string, variantCount: number}>>} Top stories.
 */
async function getTopStories(dbRef = db, limit = 5) {
  const statsSnap = await dbRef
    .collection('storyStats')
    .orderBy('variantCount', 'desc')
    .limit(limit)
    .get();
  const stories = await Promise.all(
    statsSnap.docs.map(async doc => {
      const storyDoc = await dbRef.collection('stories').doc(doc.id).get();
      return {
        title: storyDoc.data()?.title || doc.id,
        variantCount: doc.data().variantCount || 0,
      };
    })
  );
  return stories;
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
  const topStoriesFn = deps.topStoriesFn || getTopStories;
  const [storyCount, pageCount, unmoderatedCount, topStories] =
    await Promise.all([
      storyCountFn(),
      pageCountFn(),
      unmoderatedPageCountFn(),
      topStoriesFn(),
    ]);
  const html = buildHtml(storyCount, pageCount, unmoderatedCount, topStories);
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
  getTopStories,
  generate,
  handleRequest,
};
