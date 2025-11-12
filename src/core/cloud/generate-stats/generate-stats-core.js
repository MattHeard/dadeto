import { createVerifyAdmin } from './verifyAdmin.js';
import { ADMIN_UID } from './common-core.js';
import { DEFAULT_BUCKET_NAME } from './cloud-core.js';

export { productionOrigins } from './cloud-core.js';

/**
 * Build stats HTML page.
 * @param {number} storyCount Story count.
 * @param {number} pageCount Page count.
 * @param {number} unmoderatedCount Unmoderated page count.
 * @param {Array<{title: string, variantCount: number}>} [topStories]
 *   Top stories by variant count.
 * @param {...any} args
 * @returns {string} HTML page.
 */
export function buildHtml(...args) {
  const [storyCount, pageCount, unmoderatedCount, topStories] = args;
  const resolvedTopStories = topStories ?? [];
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
        <a href="/about.html">About</a>
        <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
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
            <a class="admin-link" href="/admin.html" style="display:none">Admin</a>
          </div>

          <div class="menu-group">
            <h3>About</h3>
            <a href="/about.html">About</a>
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
      const als = document.querySelectorAll('.admin-link');
      const sbs = document.querySelectorAll('#signinButton');
      const sws = document.querySelectorAll('#signoutWrap');
      const sos = document.querySelectorAll('#signoutLink');
      function showSignedIn() {
        sbs.forEach(el => (el.style.display = 'none'));
        sws.forEach(el => (el.style.display = ''));
        if (isAdmin()) als.forEach(el => (el.style.display = ''));
      }
      function showSignedOut() {
        sbs.forEach(el => (el.style.display = ''));
        sws.forEach(el => (el.style.display = 'none'));
        als.forEach(el => (el.style.display = 'none'));
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
        const data = ${JSON.stringify(resolvedTopStories)};
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

const DEFAULT_URL_MAP = 'prod-dendrite-url-map';
const DEFAULT_CDN_HOST = 'www.dendritestories.co.nz';
/**
 * Determine whether a Firebase initialization error indicates a duplicate app.
 * @param {unknown} error Error thrown when calling initializeApp.
 * @returns {boolean} True when the error represents an existing app instance.
 */
export function isDuplicateAppError(error) {
  if (!error) {
    return false;
  }

  const hasDuplicateIdentifier =
    error.code === 'app/duplicate-app' || typeof error.message === 'string';

  if (!hasDuplicateIdentifier) {
    return false;
  }

  return String(error.message).toLowerCase().includes('already exists');
}

/**
 * Initialize the Firebase app, ignoring duplicate app errors.
 * @param {() => void} initFn Initialization function to invoke.
 */
export function initializeFirebaseApp(initFn) {
  try {
    initFn();
  } catch (error) {
    if (!isDuplicateAppError(error)) {
      throw error;
    }
  }
}

/** @typedef {import('node:process').ProcessEnv} ProcessEnv */

/**
 * Derive the Google Cloud project identifier from environment variables.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string | undefined} Project identifier if present.
 */
export function getProjectFromEnv(env) {
  if (!env || typeof env !== 'object') {
    return undefined;
  }
  return env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT;
}

/**
 * Resolve the URL map identifier used for CDN invalidations.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} URL map identifier.
 */
export function getUrlMapFromEnv(env) {
  if (!env || typeof env !== 'object') {
    return DEFAULT_URL_MAP;
  }

  return env.URL_MAP || DEFAULT_URL_MAP;
}

/**
 * Resolve the CDN host used for cache invalidations from environment variables.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} CDN host name.
 */
export function getCdnHostFromEnv(env) {
  if (!env || typeof env !== 'object') {
    return DEFAULT_CDN_HOST;
  }

  const cdnHost = env.CDN_HOST;
  if (typeof cdnHost === 'string' && cdnHost.trim()) {
    return cdnHost;
  }

  return DEFAULT_CDN_HOST;
}

/**
 * Create the core helpers for the generate stats workflow.
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth,
 *   storage: import('@google-cloud/storage').Storage,
 *   fetchFn: typeof fetch,
 *   env?: ProcessEnv | Record<string, string | undefined>,
 *   urlMap?: string,
 *   cryptoModule: { randomUUID: () => string },
 * }} deps Dependencies required by the workflow.
 * @returns {{
 *   getStoryCount: (dbRef?: import('firebase-admin/firestore').Firestore) => Promise<number>,
 *   getPageCount: (dbRef?: import('firebase-admin/firestore').Firestore) => Promise<number>,
 *   getUnmoderatedPageCount: (dbRef?: import('firebase-admin/firestore').Firestore) => Promise<number>,
 *   getTopStories: (
 *     dbRef?: import('firebase-admin/firestore').Firestore,
 *     limit?: number
 *   ) => Promise<Array<{ title: string, variantCount: number }>>,
 *   getAccessTokenFromMetadata: () => Promise<string>,
 *   invalidatePaths: (paths: string[]) => Promise<void>,
 *   generate: (deps?: {
 *     storyCountFn?: () => Promise<number>,
 *     pageCountFn?: () => Promise<number>,
 *     unmoderatedPageCountFn?: () => Promise<number>,
 *     topStoriesFn?: () => Promise<Array<{ title: string, variantCount: number }>>,
 *     storageInstance?: import('@google-cloud/storage').Storage,
 *     bucketName?: string,
 *     invalidatePathsFn?: (paths: string[]) => Promise<void>,
 *   }) => Promise<null>,
 *   handleRequest: (
 *     req: import('express').Request,
 *     res: import('express').Response,
 *     deps?: { genFn?: () => Promise<unknown>, authInstance?: import('firebase-admin/auth').Auth, adminUid?: string }
 *   ) => Promise<void>,
 * }} Core helpers.
 */
export function createGenerateStatsCore({
  db,
  auth,
  storage,
  fetchFn,
  env,
  urlMap,
  cryptoModule,
  console = globalThis.console,
}) {
  let envRef = {};
  if (env && typeof env === 'object') {
    envRef = env;
  }
  const project = getProjectFromEnv(envRef);
  const resolvedUrlMap = urlMap || getUrlMapFromEnv(envRef);
  const resolvedCdnHost = getCdnHostFromEnv(envRef);
  const fetchImpl = fetchFn ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation required');
  }

  const metadataTokenUrl =
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

  /**
   * Count the number of stories stored in Firestore.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @returns {Promise<number>} Story count.
   */
  async function getStoryCount(dbRef = db) {
    const snap = await dbRef.collection('stories').count().get();
    return snap.data().count;
  }

  /**
   * Count the number of pages across every story variant.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @returns {Promise<number>} Page count.
   */
  async function getPageCount(dbRef = db) {
    const snap = await dbRef.collectionGroup('pages').count().get();
    return snap.data().count;
  }

  /**
   * Count unmoderated variants by checking for zero and null reputation sums.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @returns {Promise<number>} Unmoderated variant count.
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
    return zeroSnap.data().count + nullSnap.data().count;
  }

  /**
   * Retrieve the top stories by variant count.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @param {number} [limit] - Maximum number of stories to fetch. Defaults to 5.
   * @returns {Promise<Array<{ title: string, variantCount: number }>>} Top stories data.
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
   * Request a service account access token from the metadata server.
   * @returns {Promise<string>} OAuth access token.
   */
  async function getAccessTokenFromMetadata() {
    const response = await fetchImpl(metadataTokenUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });
    if (!response.ok) {
      throw new Error(`metadata token: HTTP ${response.status}`);
    }
    const { access_token: accessToken } = await response.json();
    return accessToken;
  }

  /**
   * Invalidate CDN paths via the Compute Engine API.
   * @param {string[]} paths - CDN paths to invalidate.
   * @param {{ error?: (message: string, ...args: any[]) => void }} [logger] Logger used to surface invalidation errors.
   * @returns {Promise<void>} Resolves when invalidation requests finish.
   */
  async function invalidatePaths(paths, logger = console) {
    const token = await getAccessTokenFromMetadata();
    await Promise.all(
      paths.map(async path => {
        try {
          const res = await fetchImpl(
            `https://compute.googleapis.com/compute/v1/projects/${project}/global/urlMaps/${resolvedUrlMap}/invalidateCache`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host: resolvedCdnHost,
                path,
                requestId: cryptoModule.randomUUID(),
              }),
            }
          );
          if (!res.ok) {
            logger.error?.(`invalidate ${path} failed: ${res.status}`);
          }
        } catch (err) {
          logger.error?.(`invalidate ${path} error`, err?.message || err);
        }
      })
    );
  }

  /**
   * Generate the stats page HTML and upload it to Cloud Storage.
   * @param {{
   *   storyCountFn?: () => Promise<number>,
   *   pageCountFn?: () => Promise<number>,
   *   unmoderatedPageCountFn?: () => Promise<number>,
   *   topStoriesFn?: () => Promise<Array<{ title: string, variantCount: number }>>,
   *   storageInstance?: import('@google-cloud/storage').Storage,
   *   bucketName?: string,
   *   invalidatePathsFn?: (paths: string[]) => Promise<void>,
   * }} deps - Optional dependency overrides.
   * @returns {Promise<null>} Resolves with null for compatibility.
   */
  async function generate(deps = {}) {
    const {
      storyCountFn = getStoryCount,
      pageCountFn = getPageCount,
      unmoderatedPageCountFn = getUnmoderatedPageCount,
      topStoriesFn = getTopStories,
      storageInstance = storage,
      bucketName = DEFAULT_BUCKET_NAME,
      invalidatePathsFn = invalidatePaths,
    } = deps;
    const [storyCount, pageCount, unmoderatedCount, topStories] =
      await Promise.all([
        storyCountFn(),
        pageCountFn(),
        unmoderatedPageCountFn(),
        topStoriesFn(),
      ]);
    const html = buildHtml(storyCount, pageCount, unmoderatedCount, topStories);
    const bucketRef = storageInstance.bucket(bucketName);
    await bucketRef.file('stats.html').save(html, {
      contentType: 'text/html',
      metadata: { cacheControl: 'no-cache' },
    });
    await invalidatePathsFn(['/stats.html'], console);
    return null;
  }

  /**
   * Handle HTTP requests to trigger the stats generation workflow.
   * @param {import('express').Request} req - Incoming HTTP request.
   * @param {import('express').Response} res - Response object for sending results.
   * @param {{
   *   genFn?: () => Promise<unknown>,
   *   authInstance?: import('firebase-admin/auth').Auth,
   *   adminUid?: string,
   * }} [deps] - Optional dependency overrides. Defaults to an empty object.
   * @returns {Promise<void>} Resolves when the request finishes.
   */
  async function handleRequest(req, res, deps = {}) {
    const {
      genFn = generate,
      authInstance = auth,
      adminUid = ADMIN_UID,
    } = deps;
    if (req.method !== 'POST') {
      res.status(405).send('POST only');
      return;
    }

    const isCron = req.get('X-Appengine-Cron') === 'true';
    const adminId = adminUid;

    if (!isCron) {
      const verifyAdmin = createVerifyAdmin({
        verifyToken: token => authInstance.verifyIdToken(token),
        isAdminUid: decoded => decoded.uid === adminId,
        sendUnauthorized: (response, message) => {
          response.status(401).send(message);
        },
        sendForbidden: response => {
          response.status(403).send('Forbidden');
        },
      });

      const isAuthorized = await verifyAdmin(req, res);
      if (!isAuthorized) {
        return;
      }
    }

    try {
      await genFn();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err?.message || 'generate failed' });
    }
  }

  return {
    getStoryCount,
    getPageCount,
    getUnmoderatedPageCount,
    getTopStories,
    getAccessTokenFromMetadata,
    invalidatePaths,
    generate,
    handleRequest,
  };
}
