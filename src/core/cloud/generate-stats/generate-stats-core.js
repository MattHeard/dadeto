import { createVerifyAdmin } from './verifyAdmin.js';
import { ADMIN_UID, isNonNullObject } from './common-core.js';
import {
  DEFAULT_BUCKET_NAME,
  isDuplicateAppError,
  sendOkResponse,
} from './cloud-core.js';
import { runInParallel } from '../parallel-utils.js';
import { runWithFailureAndThen } from '../response-utils.js';
export { isDuplicateAppError };

/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */

/** @typedef {Record<string, string | undefined>} EnvironmentMap */
/** @typedef {{ randomUUID: () => string }} StatsCryptoModule */
/** @typedef {{ error: (message: string, ...args: any[]) => void }} StatsLogger */

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

/**
 * Emit the script that renders the top stories list.
 * @param {string} dataStr Serialized top stories payload.
 * @returns {string} Script tag that bootstraps the top stories renderer.
 */
function buildTopStoriesScript(dataStr) {
  return `    <script type="module">
      import { renderTopStories } from '/statsTopStories.js';
      renderTopStories(${dataStr});
    </script>`;
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
 * Initialize the Firebase app, ignoring duplicate app errors.
 * @param {() => void} initFn Initialization function to invoke.
 */
export function initializeFirebaseApp(initFn) {
  try {
    initFn();
  } catch (error) {
    handleInitializeError(error);
  }
}

/**
 *
 * @param error
 */
/**
 * Rethrow non-duplicate app errors during initialization.
 * @param {unknown} error Error raised while initializing Firebase.
 */
function handleInitializeError(error) {
  if (!isDuplicateAppError(error)) {
    throw error;
  }
}

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
 * @param {EnvironmentMap | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {EnvironmentMap | Record<string, string | undefined> | null} Normalized env map.
 */
function resolveEnv(env) {
  if (!isEnvLike(env)) {
    return null;
  }

  return env;
}

/**
 *
 * @param env
 */
/**
 * Check whether the provided value resembles an environment object.
 * @param {unknown} env Candidate value extracted from runtime.
 * @returns {env is Record<string, string | undefined>} True when the value is a non-null object.
 */
function isEnvLike(env) {
  return Boolean(env) && typeof env === 'object';
}

/**
 * Derive the Google Cloud project identifier from environment variables.
 * @param {EnvironmentMap | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string | undefined} Project identifier if present.
 */
export function getProjectFromEnv(env) {
  return resolveProjectId(resolveEnv(env));
}

/**
 * Extract the project identifier from resolved environment variables.
 * @param {EnvironmentMap | Record<string, string | undefined> | null} resolved Sanitized environment map.
 * @returns {string | undefined} Resolved project identifier if available.
 */
function resolveProjectId(resolved) {
  if (!resolved) {
    return undefined;
  }

  return extractProjectIdFromResolved(resolved);
}

/**
 * Extract the project identifier from a resolved environment map.
 * @param {EnvironmentMap | Record<string, string | undefined>} resolved Normalized environment variables.
 * @returns {string | undefined} Project identifier when available.
 */
function extractProjectIdFromResolved(resolved) {
  return resolved.GOOGLE_CLOUD_PROJECT ?? resolved.GCLOUD_PROJECT;
}

/**
 * Resolve the URL map identifier used for CDN invalidations.
 * @param {EnvironmentMap | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} URL map identifier.
 */
export function getUrlMapFromEnv(env) {
  const resolved = resolveEnv(env);
  return selectUrlMap(resolved);
}

/**
 * Derive the URL map identifier from the resolved environment data.
 * @param {EnvironmentMap | Record<string, string | undefined> | null} resolved Normalized environment map.
 * @returns {string} Resolved URL map identifier.
 */
function selectUrlMap(resolved) {
  if (!resolved) {
    return DEFAULT_URL_MAP;
  }

  return extractUrlMapFromResolved(resolved);
}

/**
 * Extract the URL map identifier from a resolved environment map.
 * @param {EnvironmentMap | Record<string, string | undefined>} resolved Normalized env.
 * @returns {string} URL map identifier.
 */
function extractUrlMapFromResolved(resolved) {
  const candidate = resolved.URL_MAP;
  if (!isNonEmptyString(candidate)) {
    return DEFAULT_URL_MAP;
  }

  return candidate;
}

/**
 * Resolve the CDN host used for cache invalidations from environment variables.
 * @param {EnvironmentMap | Record<string, string | undefined>} [env] - Environment variables object.
 * @returns {string} CDN host name.
 */
export function getCdnHostFromEnv(env) {
  const resolved = resolveEnv(env);
  return selectCdnHost(resolved?.CDN_HOST);
}

/**
 * Resolve the CDN host or fall back to the default.
 * @param {string | undefined} candidate Candidate host value.
 * @returns {string} Resolved CDN host.
 */
function selectCdnHost(candidate) {
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
 *   env?: EnvironmentMap | Record<string, string | undefined>,
 *   urlMap?: string,
 *   cryptoModule: StatsCryptoModule,
 *   console?: StatsLogger,
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
 *     req: NativeHttpRequest,
 *     res: NativeHttpResponse,
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
  async function getStoryCount(dbRef) {
    /**
     * @param {import('firebase-admin/firestore').Firestore} reference Firestore instance used to build the query.
     * @returns {import('firebase-admin/firestore').CollectionReference} Stories collection reference.
     */
    const buildStoriesQuery = reference => reference.collection('stories');

    if (arguments.length > 0) {
      return countDocuments(buildStoriesQuery, dbRef);
    }

    return countDocuments(buildStoriesQuery);
  }

  /**
   * Count the number of pages across every story variant.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @returns {Promise<number>} Page count.
   */
  async function getPageCount(dbRef) {
    /**
     * @param {import('firebase-admin/firestore').Firestore} reference Firestore instance used to build the query.
     * @returns {import('firebase-admin/firestore').Query} Pages collection group query.
     */
    const buildPagesQuery = reference => reference.collectionGroup('pages');

    if (arguments.length > 0) {
      return countDocuments(buildPagesQuery, dbRef);
    }

    return countDocuments(buildPagesQuery);
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
   * Count the documents returned by a Firestore query builder.
   * @param {(database: import('firebase-admin/firestore').Firestore) => import('firebase-admin/firestore').Query} buildQuery Query constructor.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] Optional Firestore instance.
   * @returns {Promise<number>} Document count.
   */
  async function countDocuments(buildQuery, dbRef = db) {
    const snap = await buildQuery(dbRef).count().get();
    return snap.data().count;
  }

  /**
   * Retrieve the top stories by variant count.
   * @param {import('firebase-admin/firestore').Firestore} [dbRef] - Firestore instance to query. Defaults to the configured db.
   * @param {number} [limit] - Maximum number of stories to fetch. Defaults to 5.
   * @returns {Promise<Array<{ title: string, variantCount: number }>>} Top stories data.
   */
  async function getTopStories(dbRef = db, limit) {
    const resolvedLimit = resolveTopStoriesLimit(limit);
    return loadTopStories(dbRef, resolvedLimit);
  }

  /**
   * Resolve the limit used when fetching top stories.
   * @param {number | undefined} limitCandidate Candidate limit provided by the caller.
   * @returns {number} Limit guaranteed to be a finite number.
   */
  function resolveTopStoriesLimit(limitCandidate) {
    if (limitCandidate === undefined) {
      return 5;
    }

    return limitCandidate;
  }

  /**
   * Load story stats documents ready for conversion into metadata.
   * @param {import('firebase-admin/firestore').Firestore} dbRef Firestore instance.
   * @param {number} limit Maximum number of entries to fetch.
   * @returns {Promise<Array<{ title: string, variantCount: number }>>} Story metadata.
   */
  async function loadTopStories(dbRef, limit) {
    const statsSnap = await dbRef
      .collection('storyStats')
      .orderBy('variantCount', 'desc')
      .limit(limit)
      .get();
    return buildTopStoriesFromDocs(dbRef, statsSnap.docs);
  }

  /**
   * Build the metadata payload for a top story entry.
   * @param {import('firebase-admin/firestore').Firestore} dbRef Firestore reference.
   * @param {import('firebase-admin/firestore').QueryDocumentSnapshot} statsDoc Document from the storyStats collection.
   * @returns {Promise<{ title: string, variantCount: number }>} Story metadata.
   */
  async function buildTopStoryFromStatsDoc(dbRef, statsDoc) {
    const storyDoc = await dbRef.collection('stories').doc(statsDoc.id).get();
    return {
      title: getStoryTitle(storyDoc.data(), statsDoc.id),
      variantCount: statsDoc.data().variantCount || 0,
    };
  }

  /**
   * Build metadata payloads for a collection of stats documents.
   * @param {import('firebase-admin/firestore').Firestore} dbRef Firestore instance used for lookups.
   * @param {import('firebase-admin/firestore').QueryDocumentSnapshot[]} docs Story stats documents to process.
   * @returns {Promise<Array<{ title: string, variantCount: number }>>} Top story metadata.
   */
  function buildTopStoriesFromDocs(dbRef, docs) {
    return Promise.all(
      docs.map(statDoc => buildTopStoryFromStatsDoc(dbRef, statDoc))
    );
  }

  /**
   * Normalize the title stored on a story document.
   * @param {import('firebase-admin/firestore').DocumentData | undefined} data Document data read from Firestore.
   * @param {string} fallback Identifier used when the title is missing.
   * @returns {string} Story title.
   */
  function getStoryTitle(data, fallback) {
    return resolveStoryTitle(data?.title, fallback);
  }

  /**
   * Normalize a story title candidate.
   * @param {unknown} candidate Title candidate read from Firestore.
   * @param {string} fallback Identifier to use when the title is missing.
   * @returns {string} Resolved story title.
   */
  function resolveStoryTitle(candidate, fallback) {
    if (!isNonEmptyString(candidate)) {
      return fallback;
    }

    return candidate;
  }

  /**
   * Request a service account access token from the metadata server.
   * @returns {Promise<string>} OAuth access token.
   */
  async function getAccessTokenFromMetadata() {
    const response = await fetchImpl(metadataTokenUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });
    validateMetadataResponse(response);
    const metadata = /** @type {{ access_token: string }} */ (
      await response.json()
    );
    return metadata.access_token;
  }

  /**
   *
   * @param response
   */
  /**
   * Ensure the metadata response succeeded.
   * @param {Response} response Metadata server response.
   */
  function validateMetadataResponse(response) {
    if (response.ok) {
      return;
    }

    throw new Error(`metadata token: HTTP ${response.status}`);
  }

  /**
   * Invalidate CDN paths via the Compute Engine API.
   * @param {string[]} paths - CDN paths to invalidate.
   * @param {StatsLogger} [logger] Logger used to surface invalidation errors.
   * @returns {Promise<void>} Resolves when invalidation requests finish.
   */
  async function invalidatePaths(paths, logger = console) {
    const token = await getAccessTokenFromMetadata();
    await runInParallel(paths, path =>
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
    await invalidatePaths(['/stats.html'], console);
    return null;
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

  /**
   * @param {string} token OAuth token.
   * @returns {Promise<unknown>} Verification result.
   */
  const verifyToken = token => auth.verifyIdToken(token);
  /**
   * @param {{ uid?: string | undefined }} decoded Auth payload.
   * @returns {boolean} True when the decoded payload belongs to the admin.
   */
  const isAdminUid = decoded => decoded.uid === ADMIN_UID;
  /**
   * Send a 401 response when authentication fails.
   * @param {NativeHttpResponse} res - Express response helper.
   * @param {string} message - Text to include in the response body.
   * @returns {void}
   */
  function sendUnauthorized(res, message) {
    res.status(401).send(message);
  }
  /**
   * Send a 403 response when authorization fails.
   * @param {NativeHttpResponse} res - Response helper used to send the rejection.
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
   * @param {NativeHttpRequest} req - HTTP request to inspect.
   * @returns {boolean} True when the request method is POST.
   */
  function isPostMethod(req) {
    return req.method === 'POST';
  }

  /**
   * Reply with a 405 when a non-POST method is used.
   * @param {NativeHttpResponse} res - Response object to signal the rejection.
   * @returns {void}
   */
  function sendPostOnlyResponse(res) {
    res.status(405).send('POST only');
  }

  /**
   * Handle HTTP requests to trigger the stats generation workflow.
   * @param {NativeHttpRequest} req - Incoming HTTP request.
   * @param {NativeHttpResponse} res - Response object for sending results.
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
   * @param {NativeHttpRequest} req - Incoming HTTP request.
   * @param {NativeHttpResponse} res - Response object used to send the reply.
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
 * Normalize the provided environment reference into an object map.
 * @param {unknown} env Env source.
 * @returns {Record<string, string | undefined>} Env object.
 */
function normalizeEnvObject(env) {
  if (!isEnvLike(env)) {
    return {};
  }

  return env;
}

/**
 * Resolve the URL map identifier.
 * @param {string | undefined} urlMap Url map override.
 * @param {Record<string, string | undefined>} envRef Normalized environment.
 * @returns {string} Url map.
 */
function resolveUrlMap(urlMap, envRef) {
  return urlMap ?? getUrlMapFromEnv(envRef);
}

/**
 * Resolve CDN host.
 * @param {Record<string, string | undefined>} envRef Env ref.
 * @returns {string} CDN host.
 */
function resolveCdnHost(envRef) {
  return getCdnHostFromEnv(envRef);
}

/**
 * Resolve the fetch implementation required for HTTP requests.
 * @param {unknown} fetchFn Optional fetch override.
 * @returns {typeof fetch} Fetch implementation.
 */
function resolveFetchImpl(fetchFn) {
  if (typeof fetchFn === 'function') {
    return /** @type {typeof fetch} */ (fetchFn);
  }

  return resolveGlobalFetch();
}

/**
 * Obtain a globally available `fetch` implementation when no override is provided.
 * @returns {typeof fetch} Bound fetch implementation.
 */
function resolveGlobalFetch() {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error('fetch implementation required');
}

/**
 * Invalidate a single CDN path.
 * @param {object} deps Deps.
 * @param {string} deps.path Path.
 * @param {typeof fetch} deps.fetchImpl Fetch.
 * @param {string} deps.project Project.
 * @param {string} deps.resolvedUrlMap Url map.
 * @param {string} deps.resolvedCdnHost Host.
 * @param {() => string} deps.randomUUID UUID.
 * @param {StatsLogger} deps.logger Logger.
 * @param {string} deps.token Token.
 * @returns {Promise<void>} Promise.
 */
async function invalidateSinglePath({ path, logger = console, ...sendDeps }) {
  try {
    const res = await sendInvalidateRequest(sendDeps, path);
    handleInvalidateResponse(res, path, logger);
  } catch (err) {
    logInvalidateError(logger, path, err);
  }
}

/**
 * Send invalidate request.
 * @param {object} deps Deps.
 * @param {typeof fetch} deps.fetchImpl HTTP client.
 * @param {string} deps.project Google Cloud project name.
 * @param {string} deps.resolvedUrlMap CDN URL map.
 * @param {string} deps.resolvedCdnHost CDN host header.
 * @param {() => string} deps.randomUUID Request ID generator.
 * @param {string} deps.token Metadata access token.
 * @param {string} path CDN path to invalidate.
 * @returns {Promise<Response>} Response.
 */
function sendInvalidateRequest(
  { fetchImpl, project, resolvedUrlMap, resolvedCdnHost, randomUUID, token },
  path
) {
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
 * @param {StatsLogger} logger Logger.
 * @returns {void}
 */
function handleInvalidateResponse(res, path, logger) {
  if (res.ok) {
    return;
  }

  logInvalidateFailure(logger, path, res.status);
}

/**
 *
 * @param logger
 * @param path
 * @param status
 */
/**
 * Emit a log message when an invalidation fails.
 * @param {StatsLogger} logger Logger used to surface problems.
 * @param {string} path CDN path that triggered the failure.
 * @param {number} status HTTP status code returned by the failed invalidation.
 */
function logInvalidateFailure(logger, path, status) {
  logger.error?.(`invalidate ${path} failed: ${status}`);
}

/**
 * Log invalidate error.
 * @param {StatsLogger} logger Logger.
 * @param {string} path Path.
 * @param {unknown} err Error.
 * @returns {void}
 */
function logInvalidateError(logger, path, err) {
  logger.error(`invalidate ${path} error`, getLogMessage(err));
}

/**
 * Normalize an error payload into a usable message.
 * @param {unknown} err Error object.
 * @returns {string | unknown} Message text or original payload.
 */
function getLogMessage(err) {
  return resolveErrorMessage(err, value => value);
}

/**
 *
 * @param err
 */
/**
 * Decide whether the candidate payload exposes a string message.
 * @param {unknown} err Potential error value.
 * @returns {err is { message: string }} True when the payload carries a message.
 */
function isErrorWithMessage(err) {
  if (!isNonNullObject(err)) {
    return false;
  }

  return typeof err.message === 'string';
}

/**
 * Resolve an error message with an optional fallback.
 * @param {unknown} err Candidate error payload.
 * @param {(err: unknown) => unknown} fallback Fallback used when no string message exists.
 * @returns {string | unknown} The resolved message.
 */
function resolveErrorMessage(err, fallback) {
  if (isErrorWithMessage(err)) {
    return err.message;
  }

  return fallback(err);
}

/**
 * Check authorization for incoming request.
 * @param {NativeHttpRequest} req Req.
 * @param {NativeHttpResponse} res Res.
 * @param {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<boolean>} verifyAdmin Verify fn.
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
 * @param {NativeHttpRequest} req Req.
 * @returns {boolean} True if cron.
 */
function isCronRequest(req) {
  return req.get?.('X-Appengine-Cron') === 'true';
}

/**
 * Run generation and respond appropriately.
 * @param {NativeHttpResponse} res Res.
 * @param {() => Promise<unknown>} generate Generate fn.
 * @returns {Promise<void>} Promise.
 */
async function respondWithGenerate(res, generate) {
  await runWithFailureAndThen(
    () => generate(),
    err => {
      sendGenerateFailure(res, err);
    },
    () => sendOkResponse(res)
  );
}
/**
 * Send a failure response when generation throws.
 * @param {NativeHttpResponse} res Express response helper.
 * @param {unknown} err Error raised during generation.
 */
function sendGenerateFailure(res, err) {
  res.status(500).json({ error: getGenerateErrorMessage(err) });
}

/**
 * Build the error message returned to clients when generation fails.
 * @param {unknown} err Generation error payload.
 * @returns {string} Message sent in the response.
 */
function getGenerateErrorMessage(err) {
  return resolveErrorMessage(err, () => 'generate failed');
}
