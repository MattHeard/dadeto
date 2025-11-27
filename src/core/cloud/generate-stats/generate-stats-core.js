import { createVerifyAdmin } from './verifyAdmin.js';
import { ADMIN_UID } from './common-core.js';
import { DEFAULT_BUCKET_NAME } from './cloud-core.js';

const STATS_PAGE_HEAD = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dendrite stats</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/dendrite.css" />
  </head>`;

const SITE_HEADER_HTML = `  <body>
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
    </div>`;

const GOOGLE_CLIENT_SCRIPT = `    <script src="https://accounts.google.com/gsi/client" defer></script>`;

const D3_SCRIPT = `    <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>`;

const D3_SANKEY_SCRIPT = `    <script src="https://cdn.jsdelivr.net/npm/d3-sankey@0.12/dist/d3-sankey.min.js"></script>`;

const GOOGLE_AUTH_MODULE_SCRIPT = `    <script type="module" src="/statsGoogleAuthModule.js"></script>`;

const TOP_STORIES_INVOCATION_SCRIPT = dataStr => `    <script type="module">
      import { renderTopStories } from '/statsTopStories.js';
      renderTopStories(${dataStr});
    </script>`;

/**
 *
 * @param dataStr
 */
function buildTopStoriesScript(dataStr) {
  return `${TOP_STORIES_INVOCATION_SCRIPT(dataStr)}`;
}

const MENU_SCRIPT = `    <script type="module" src="/statsMenu.js"></script>
  </body>
</html>`;

export { productionOrigins } from './cloud-core.js';

/**
 * Build stats HTML page.
 * @param {...unknown} args Rendering inputs: storyCount, pageCount, unmoderatedCount, and optional topStories.
 * @returns {string} HTML page.
 */
export function buildHtml(...args) {
  const [storyCount, pageCount, unmoderatedCount, topStories] = args;
  const resolvedTopStories = topStories ?? [];
  return `${STATS_PAGE_HEAD}
${SITE_HEADER_HTML}
    <main>
      <h1>Stats</h1>
      <p>Number of stories: ${storyCount}</p>
      <p>Number of pages: ${pageCount}</p>
      <p>Number of unmoderated pages: ${unmoderatedCount}</p>
      <div id="topStories"></div>
    </main>
${GOOGLE_CLIENT_SCRIPT}
${D3_SCRIPT}
${D3_SANKEY_SCRIPT}
${GOOGLE_AUTH_MODULE_SCRIPT}
${buildTopStoriesScript(JSON.stringify(resolvedTopStories))}
${MENU_SCRIPT}`;
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

  return hasDuplicateIdentifier(error) && messageIndicatesDuplicate(error);
}

/**
 *
 * @param error
 */
function hasDuplicateIdentifier(error) {
  return (
    error.code === 'app/duplicate-app' || typeof error.message === 'string'
  );
}

/**
 *
 * @param error
 */
function messageIndicatesDuplicate(error) {
  if (typeof error.message !== 'string') {
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
 * Determine whether a value is a non-empty string.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is a trimmed string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Ensure the environment object is usable for lookups.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {ProcessEnv | Record<string, string | undefined> | null} Normalized env map.
 */
function resolveEnv(env) {
  if (!env || typeof env !== 'object') {
    return null;
  }

  return env;
}

/**
 * Derive the Google Cloud project identifier from environment variables.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string | undefined} Project identifier if present.
 */
export function getProjectFromEnv(env) {
  return resolveProjectId(resolveEnv(env));
}

/**
 *
 * @param resolved
 */
function resolveProjectId(resolved) {
  if (!resolved) {
    return undefined;
  }

  return resolved.GOOGLE_CLOUD_PROJECT ?? resolved.GCLOUD_PROJECT;
}

/**
 * Resolve the URL map identifier used for CDN invalidations.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} URL map identifier.
 */
export function getUrlMapFromEnv(env) {
  const resolved = resolveEnv(env);
  return resolved?.URL_MAP ?? DEFAULT_URL_MAP;
}

/**
 * Resolve the CDN host used for cache invalidations from environment variables.
 * @param {ProcessEnv | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} CDN host name.
 */
export function getCdnHostFromEnv(env) {
  const resolved = resolveEnv(env);
  const candidate = resolved?.CDN_HOST;
  if (isNonEmptyString(candidate)) {
    return candidate;
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
  const envRef = normalizeEnvObject(env);
  const project = getProjectFromEnv(envRef);
  const resolvedUrlMap = resolveUrlMap(urlMap, envRef);
  const resolvedCdnHost = resolveCdnHost(envRef);
  const fetchImpl = resolveFetchImpl(fetchFn);

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
      paths.map(path =>
        invalidateSinglePath({
          path,
          fetchImpl,
          project,
          resolvedUrlMap,
          resolvedCdnHost,
          randomUUID: cryptoModule.randomUUID,
          logger,
          token,
        })
      )
    );
  }

  /**
   * Generate the stats page HTML and upload it to Cloud Storage.
   * @returns {Promise<null>} Resolves with null for compatibility.
   */
  async function generate() {
    const [storyCount, pageCount, unmoderatedCount, topStories] =
      await fetchStatsData();
    const html = buildHtml(storyCount, pageCount, unmoderatedCount, topStories);
    const bucketRef = getStatsBucketRef(storage);
    await uploadStatsHtml(bucketRef, html);
    return invalidatePaths(['/stats.html'], console);
  }

  /**
   * Resolve the Cloud Storage bucket used for stats uploads.
   * @param {import('@google-cloud/storage').Storage} storageInstance Storage client.
   * @returns {import('@google-cloud/storage').Bucket} Bucket reference.
   */
  function getStatsBucketRef(storageInstance) {
    return storageInstance.bucket(DEFAULT_BUCKET_NAME);
  }

  /**
   * Upload the generated HTML to stats bucket.
   * @param {import('@google-cloud/storage').Bucket} bucketRef Storage bucket reference.
   * @param {string} html Generated stats document.
   * @returns {Promise<void>} Resolves when upload completes.
   */
  function uploadStatsHtml(bucketRef, html) {
    return bucketRef.file('stats.html').save(html, {
      contentType: 'text/html',
      metadata: { cacheControl: 'no-cache' },
    });
  }

  /**
   * Read the counts and top stories required by the stats page.
   * @returns {Promise<[number, number, number, Array<{ title: string, variantCount: number }>]>} Counts and stories.
   */
  function fetchStatsData() {
    return Promise.all([
      getStoryCount(),
      getPageCount(),
      getUnmoderatedPageCount(),
      getTopStories(),
    ]);
  }

  const verifyToken = token => auth.verifyIdToken(token);
  const isAdminUid = decoded => decoded.uid === ADMIN_UID;
  /**
   * Send a 401 response when authentication fails.
   * @param {import('express').Response} res - Express response helper.
   * @param {string} message - Text to include in the response body.
   * @returns {void}
   */
  function sendUnauthorized(res, message) {
    res.status(401).send(message);
  }
  /**
   * Send a 403 response when authorization fails.
   * @param {import('express').Response} res - Response helper used to send the rejection.
   * @returns {void}
   */
  function sendForbidden(res) {
    res.status(403).send('Forbidden');
  }
  const verifyAdminDeps = {
    verifyToken,
    isAdminUid,
    sendUnauthorized,
    sendForbidden,
  };
  const verifyAdmin = createVerifyAdmin(verifyAdminDeps);

  /**
   * Check whether the incoming request used POST.
   * @param {import('express').Request} req - HTTP request to inspect.
   * @returns {boolean} True when the request method is POST.
   */
  function isPostMethod(req) {
    return req.method === 'POST';
  }

  /**
   * Reply with a 405 when a non-POST method is used.
   * @param {import('express').Response} res - Response object to signal the rejection.
   * @returns {void}
   */
  function sendPostOnlyResponse(res) {
    res.status(405).send('POST only');
  }

  /**
   * Handle HTTP requests to trigger the stats generation workflow.
   * @param {import('express').Request} req - Incoming HTTP request.
   * @param {import('express').Response} res - Response object for sending results.
   * @returns {Promise<void>} Resolves when the request finishes.
   */
  async function handleAuthorizedRequest(req, res) {
    const isAuthorized = await ensureAuthorizedRequest(req, res, verifyAdmin);
    if (!isAuthorized) {
      return;
    }

    await respondWithGenerate(res, generate);
  }

  /**
   * Enforce POST + authorization before invoking the handler.
   * @param {import('express').Request} req - Incoming HTTP request.
   * @param {import('express').Response} res - Response object used to send the reply.
   * @returns {Promise<void>} Resolves after the request handling completes.
   */
  async function handleRequest(req, res) {
    if (!isPostMethod(req)) {
      sendPostOnlyResponse(res);
    } else {
      await handleAuthorizedRequest(req, res);
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

/**
 * Normalize environment to object.
 * @param {unknown} env Env.
 * @returns {Record<string, string | undefined>} Env object.
 */
function normalizeEnvObject(env) {
  if (env && typeof env === 'object') {
    return env;
  }

  return {};
}

/**
 * Resolve URL map.
 * @param {string | undefined} urlMap Url map.
 * @param {Record<string, string | undefined>} envRef Env ref.
 * @returns {string | undefined} Url map.
 */
function resolveUrlMap(urlMap, envRef) {
  if (urlMap) {
    return urlMap;
  }

  return getUrlMapFromEnv(envRef);
}

/**
 * Resolve CDN host.
 * @param {Record<string, string | undefined>} envRef Env ref.
 * @returns {string | undefined} CDN host.
 */
function resolveCdnHost(envRef) {
  return getCdnHostFromEnv(envRef);
}

/**
 * Resolve fetch implementation.
 * @param {unknown} fetchFn Fetch fn.
 * @returns {Function} Fetch.
 */
function resolveFetchImpl(fetchFn) {
  const candidate = fetchFn ?? globalThis.fetch;
  if (typeof candidate !== 'function') {
    throw new Error('fetch implementation required');
  }

  return candidate;
}

/**
 * Invalidate a single CDN path.
 * @param {object} deps Deps.
 * @param {string} deps.path Path.
 * @param {Function} deps.fetchImpl Fetch.
 * @param {string} deps.project Project.
 * @param {string} deps.resolvedUrlMap Url map.
 * @param {string} deps.resolvedCdnHost Host.
 * @param {Function} deps.randomUUID UUID.
 * @param {{ error?: (message: string, ...args: any[]) => void }} deps.logger Logger.
 * @param {string} deps.token Token.
 * @returns {Promise<void>} Promise.
 */
async function invalidateSinglePath({
  path,
  fetchImpl,
  project,
  resolvedUrlMap,
  resolvedCdnHost,
  randomUUID,
  logger,
  token,
}) {
  try {
    const res = await sendInvalidateRequest({
      fetchImpl,
      project,
      resolvedUrlMap,
      resolvedCdnHost,
      randomUUID,
      token,
      path,
    });
    handleInvalidateResponse(res, path, logger);
  } catch (err) {
    logInvalidateError(logger, path, err);
  }
}

/**
 * Send invalidate request.
 * @param {object} deps Deps.
 * @param deps.fetchImpl
 * @param deps.project
 * @param deps.resolvedUrlMap
 * @param deps.resolvedCdnHost
 * @param deps.randomUUID
 * @param deps.token
 * @param deps.path
 * @returns {Promise<Response>} Response.
 */
function sendInvalidateRequest({
  fetchImpl,
  project,
  resolvedUrlMap,
  resolvedCdnHost,
  randomUUID,
  token,
  path,
}) {
  return fetchImpl(
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
        requestId: randomUUID(),
      }),
    }
  );
}

/**
 * Handle invalidate response.
 * @param {{ ok: boolean, status: number }} res Response.
 * @param {string} path Path.
 * @param {{ error?: (message: string, ...args: any[]) => void }} logger Logger.
 * @returns {void}
 */
function handleInvalidateResponse(res, path, logger) {
  if (!res.ok) {
    logger.error?.(`invalidate ${path} failed: ${res.status}`);
  }
}

/**
 * Log invalidate error.
 * @param {{ error?: (message: string, ...args: any[]) => void }} logger Logger.
 * @param {string} path Path.
 * @param {unknown} err Error.
 * @returns {void}
 */
function logInvalidateError(logger, path, err) {
  if (typeof logger.error !== 'function') {
    return;
  }

  logger.error(`invalidate ${path} error`, getLogMessage(err));
}

/**
 * Normalize an error payload into a message string when available.
 * @param {unknown} err Error object.
 * @returns {string | unknown} Message text or original payload.
 */
function getLogMessage(err) {
  if (err && typeof err === 'object' && err !== null) {
    const message = err.message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return err;
}

/**
 * Check authorization for incoming request.
 * @param {import('express').Request} req Req.
 * @param {import('express').Response} res Res.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<boolean>} verifyAdmin Verify fn.
 * @returns {Promise<boolean>} Authorization result.
 */
async function ensureAuthorizedRequest(req, res, verifyAdmin) {
  if (isCronRequest(req)) {
    return true;
  }

  return verifyAdmin(req, res);
}

/**
 * Determine if request is cron.
 * @param {import('express').Request} req Req.
 * @returns {boolean} True if cron.
 */
function isCronRequest(req) {
  return req.get('X-Appengine-Cron') === 'true';
}

/**
 * Run generate and respond.
 * @param {import('express').Response} res Res.
 * @param {() => Promise<unknown>} generate Generate fn.
 * @returns {Promise<void>} Promise.
 */
function respondWithGenerate(res, generate) {
  return generate()
    .then(() => res.status(200).json({ ok: true }))
    .catch(err =>
      res.status(500).json({ error: err?.message || 'generate failed' })
    );
}
