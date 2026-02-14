import {
  DEFAULT_BUCKET_NAME,
  productionOrigins,
  sendOkResponse,
} from './cloud-core.js';
import { assertFunction } from './common-core.js';
export { DEFAULT_BUCKET_NAME, productionOrigins };
/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */
const DEFAULT_PAGE_SIZE = 100;

/**
 * @typedef {object} StoryInfo
 * @property {number | null} pageNumber Page number for the story.
 * @property {string} title Story title text.
 */

/**
 * @typedef {object} RenderDependencies
 * @property {() => Promise<string[]>} [fetchTopStoryIds] Optional override for fetching story ids.
 * @property {(storyId: string) => Promise<StoryInfo | null>} [fetchStoryInfo] Optional override for fetching story info.
 */

/**
 * @typedef {object} FetchResponse
 * @property {boolean} ok Whether the response was successful.
 * @property {number} status HTTP status code.
 * @property {() => Promise<any>} json Parse response body as JSON.
 */

/**
 * @typedef {object} DbInstance
 * @property {Function} collection Firestore collection accessor.
 */

/**
 * @typedef {object} StorageInstance
 * @property {Function} bucket Cloud storage bucket accessor.
 */

/**
 * @typedef {object} RenderOptions
 * @property {DbInstance} [db] Firestore-like instance used for lookup helpers.
 * @property {StorageInstance} [storage] Cloud storage-like instance.
 * @property {(input: string, init?: object) => Promise<FetchResponse>} fetchFn Fetch implementation.
 * @property {() => string} randomUUID UUID generator for cache invalidation.
 * @property {string} [projectId] Google Cloud project identifier.
 * @property {string} [urlMapName] Compute URL map identifier.
 * @property {string} [cdnHost] CDN host name used for invalidation requests.
 * @property {(message: string, error?: unknown) => void} [consoleError] Logger for invalidate failures.
 * @property {string} [bucketName] Target bucket name for rendered files.
 * @property {number} [pageSize] Number of items per generated page.
 */

/**
 * Ensure the provided Firestore-like instance exposes the expected helpers.
 * @param {{ collection: Function }} db Firestore-like instance to validate.
 * @returns {void}
 */
function assertDb(db) {
  ensureDbValue(db);
  ensureCollectionHelper(db);
}

/**
 * Assert that a database instance value exists before validating helpers.
 * @param {unknown} db Candidate database value.
 * @returns {void}
 */
function ensureDbValue(db) {
  if (!db) {
    throw new TypeError('db must provide a collection helper');
  }
}

/**
 * Assert the provided database exposes a collection helper.
 * @param {{ collection?: Function }} db Firestore-like instance to inspect.
 * @returns {void}
 */
function ensureCollectionHelper(db) {
  if (typeof db.collection !== 'function') {
    throw new TypeError('db must provide a collection helper');
  }
}

/**
 * Ensure the provided Storage-like instance exposes the expected helpers.
 * @param {{ bucket: Function }} storage Storage-like instance to validate.
 * @returns {void}
 */
function assertStorage(storage) {
  ensureStorageValue(storage);
  ensureBucketHelper(storage);
}

/**
 * Assert that a storage value is provided before checking helpers.
 * @param {unknown} storage Candidate storage helper.
 * @returns {void}
 */
function ensureStorageValue(storage) {
  if (!storage) {
    throw new TypeError('storage must provide a bucket helper');
  }
}

/**
 * Assert the provided storage exposes a bucket helper.
 * @param {{ bucket?: Function }} storage Storage-like instance to inspect.
 * @returns {void}
 */
function ensureBucketHelper(storage) {
  if (typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

/**
 * Escape HTML special characters in a string.
 * @param {unknown} text Text that may contain unsafe HTML characters.
 * @returns {string} Escaped HTML safe string.
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
 * Render a single list entry pointing to the provided page number.
 * @param {number | string | null} pageNumber Identifier for the story page.
 * @param {string} title Escaped story title.
 * @returns {string} List item HTML snippet.
 */
function listItemHtml(pageNumber, title) {
  return `<li><a href="./p/${pageNumber}a.html">${title}</a></li>`;
}

const HEAD_HTML = `  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dendrite</title>
    <link rel="icon" href="/favicon.ico" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css"
    />
    <link rel="stylesheet" href="/dendrite.css" />
  </head>`;

const HEADER_HTML = `    <header class="site-header">
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
    </header>`;

const MOBILE_MENU_HTML = `    <!-- Mobile menu -->
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

/**
 * @param {string} list Rendered list HTML.
 * @returns {string} Main section HTML.
 */
const MAIN_HTML = list => `    <main>
      <h1>Contents</h1>
      <ol class="contents">${list}</ol>
    </main>`;

const GOOGLE_AUTH_CLIENT_SCRIPT = `    <script src="https://accounts.google.com/gsi/client" defer></script>`;

const GOOGLE_AUTH_MODULE_SCRIPT = `    <script type="module" src="./contentsGoogleAuthModule.js"></script>`;

const MENU_TOGGLE_SCRIPT = `    <script src="./contentsMenuToggle.js"></script>`;

/**
 * Build the full HTML page shell for the contents list.
 * @param {string} list Pre-rendered ordered list markup.
 * @returns {string} Page HTML string.
 */
export const PAGE_HTML = list => `<!doctype html>
<html lang="en">
${HEAD_HTML}
  <body>
${HEADER_HTML}

${MOBILE_MENU_HTML}
${MAIN_HTML(list)}
${GOOGLE_AUTH_CLIENT_SCRIPT}
${GOOGLE_AUTH_MODULE_SCRIPT}
${MENU_TOGGLE_SCRIPT}
  </body>
</html>`;

/**
 * Build an HTML document for the provided story summaries.
 * @param {StoryInfo[]} items Story info items to render.
 * @returns {string} Rendered HTML string for the dashboard page.
 */
export function buildHtml(items) {
  const list = items
    .map(item => listItemHtml(item.pageNumber, escapeHtml(item.title)))
    .join('');

  return PAGE_HTML(list);
}

/**
 * Create a helper that retrieves the most popular story ids.
 * @param {{ collection: Function }} db Firestore-like instance.
 * @returns {() => Promise<string[]>} Function that loads the top story ids.
 */
export function createFetchTopStoryIds(db) {
  assertDb(db);

  return async function fetchTopStoryIds() {
    const snapshot = await db
      .collection('storyStats')
      .orderBy('variantCount', 'desc')
      .limit(1000)
      .get();

    return snapshot.docs.map(/** @param {{ id: string }} doc */ doc => doc.id);
  };
}

/**
 * Create a helper that resolves story metadata for rendering.
 * @param {{ collection: Function }} db Firestore-like instance.
 * @returns {(storyId: string) => Promise<{title: string, pageNumber: number|null}|null>} Story loader.
 */
export function createFetchStoryInfo(db) {
  assertDb(db);

  return async function fetchStoryInfo(storyId) {
    const storySnap = await db.collection('stories').doc(storyId).get();
    return buildStoryInfoFromSnap(storySnap);
  };
}

/**
 * Build summary metadata from a story snapshot when it exists.
 * @param {{ exists?: boolean, data: () => Record<string, any> }} storySnap Story document snapshot.
 * @returns {Promise<StoryInfo | null>} Story info with title and page number or null when missing.
 */
async function buildStoryInfoFromSnap(storySnap) {
  if (!storySnap.exists) {
    return null;
  }

  return resolveStoryInfoFromStory(storySnap.data());
}

/**
 * Resolve a story's metadata once the document is present.
 * @param {Record<string, any>} story Firestore story document data.
 * @returns {Promise<StoryInfo | null>} Story metadata or null if the root page reference is missing.
 */
async function resolveStoryInfoFromStory(story) {
  if (!hasStoryRootPage(story)) {
    return null;
  }

  const result = await resolveStoryInfoFromRoot(story.rootPage, story);
  return result;
}

/**
 * Resolve story information once the root page return value arrives.
 * @param {{ get: () => Promise<{ exists: boolean, data: () => Record<string, any> }> }} rootRef Document reference for the root page.
 * @param {Record<string, any>} story Firestore story document data.
 * @returns {Promise<StoryInfo | null>} Story metadata or null when the page snapshot is missing.
 */
async function resolveStoryInfoFromRoot(rootRef, story) {
  const pageSnap = await rootRef.get();
  return buildStoryInfoFromPage(pageSnap, story);
}

/**
 * Build story metadata once the page snapshot has been fetched.
 * @param {{ exists?: boolean, data: () => Record<string, any> }} pageSnap Page snapshot returned by Firestore.
 * @param {Record<string, any>} story Story document data that owns the page.
 * @returns {StoryInfo | null} Story metadata or null when the page is missing.
 */
function buildStoryInfoFromPage(pageSnap, story) {
  if (!hasPageSnapshot(pageSnap)) {
    return null;
  }

  const page = pageSnap.data();
  return {
    title: extractStoryTitle(story),
    pageNumber: extractPageNumber(page) ?? null,
  };
}

/**
 * Check that the page snapshot exists.
 * @param {{ exists?: boolean }} pageSnap Snapshot.
 * @returns {boolean} True when exists.
 */
function hasPageSnapshot(pageSnap) {
  return Boolean(pageSnap && pageSnap.exists);
}

/**
 * Extract the story title when present.
 * @param {Record<string, any>} story Story document data.
 * @returns {string} Title string or empty string when missing.
 */
function extractStoryTitle(story) {
  if (!hasTitle(story)) {
    return '';
  }

  return story.title;
}

/**
 * Extract the numeric page number from a page document.
 * @param {Record<string, any>} page Page document data.
 * @returns {number | undefined} Numeric page number or undefined when missing.
 */
function extractPageNumber(page) {
  if (!hasPageNumber(page)) {
    return undefined;
  }

  return page.number;
}

/**
 * Determine if story data exposes a root page reference.
 * @param {Record<string, any>} story Story document data.
 * @returns {boolean} True when the story includes a root page reference.
 */
function hasStoryRootPage(story) {
  return Boolean(story?.rootPage);
}

/**
 * Check whether the story exposes a title string.
 * @param {Record<string, any>} story Story document data.
 * @returns {boolean} True when the title is a string.
 */
function hasTitle(story) {
  return typeof story?.title === 'string';
}

/**
 * Check whether the page data provides a numeric page number.
 * @param {Record<string, any>} page Page document data.
 * @returns {boolean} True when the page number is numeric.
 */
function hasPageNumber(page) {
  return typeof page?.number === 'number';
}

/**
 * Create a helper for invalidating cached CDN paths.
 * @param {object} root0 Options for the invalidation routine.
 * @param {(input: string, init?: object) => Promise<FetchResponse>} root0.fetchFn Fetch-like implementation.
 * @param {string} [root0.projectId] Google Cloud project identifier.
 * @param {string} [root0.urlMapName] Compute URL map used for invalidation.
 * @param {string} [root0.cdnHost] CDN host name to include with invalidations.
 * @param {() => string} root0.randomUUID UUID generator.
 * @param {(message: string, error?: unknown) => void} [root0.consoleError] Logger for failures.
 * @returns {(paths: string[]) => Promise<void>} Path invalidation routine.
 */
export function createInvalidatePaths({
  fetchFn,
  projectId,
  urlMapName,
  cdnHost,
  randomUUID,
  consoleError,
}) {
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const config = buildInvalidationConfig({ projectId, urlMapName, cdnHost });

  return createPathInvalidationRunner({
    fetchFn,
    randomUUID,
    consoleError,
    config,
  });
}

/**
 * Confirm the invalidation helper received an array of paths.
 * @param {unknown} paths Candidate path list.
 * @returns {boolean} True when the input is a non-empty array.
 */
function isValidPaths(paths) {
  if (!Array.isArray(paths)) {
    return false;
  }
  return paths.length > 0;
}

/**
 * Build the configuration required to send CDN invalidation requests.
 * @param {{
 *   projectId?: string,
 *   urlMapName?: string,
 *   cdnHost?: string,
 * }} params Invalidation options.
 * @returns {{ host: string, url: string }} Validation configuration.
 */
function buildInvalidationConfig({ projectId, urlMapName, cdnHost }) {
  return {
    host: resolveCdnHost(cdnHost),
    url: buildInvalidateUrl(projectId, urlMapName),
  };
}

/**
 * Return the CDN hostname or the default value when missing.
 * @param {string | undefined} cdnHost Candidate CDN host value.
 * @returns {string} Resolved CDN host.
 */
function resolveCdnHost(cdnHost) {
  return cdnHost || 'www.dendritestories.co.nz';
}

/**
 * Confirm the provided value is a non-empty string.
 * @param {unknown} value Candidate value.
 * @returns {value is string} True when the value is a trimmed string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Build the URL used to invalidate cache entries.
 * @param {string | undefined} projectId Project ID used to scope the URL.
 * @param {string | undefined} urlMapName URL map resource name.
 * @returns {string} Cache invalidation endpoint.
 */
function buildInvalidateUrl(projectId, urlMapName) {
  const projectSegment = resolveProjectSegment(projectId);
  const urlMap = resolveUrlMapName(urlMapName);

  return `https://compute.googleapis.com/compute/v1/${projectSegment}/global/urlMaps/${urlMap}/invalidateCache`;
}

/**
 * Resolve the project segment used in the invalidation URL.
 * @param {string | undefined} projectId Candidate project ID.
 * @returns {string} Resolved project segment.
 */
function resolveProjectSegment(projectId) {
  if (!isNonEmptyString(projectId)) {
    return 'projects';
  }

  return `projects/${projectId}`;
}

/**
 * Resolve the URL map identifier for invalidation.
 * @param {string | undefined} urlMapName Candidate map name.
 * @returns {string} Resolved URL map name.
 */
function resolveUrlMapName(urlMapName) {
  if (!isNonEmptyString(urlMapName)) {
    return 'prod-dendrite-url-map';
  }

  return urlMapName;
}

/**
 * Create the actual path invalidation routine.
 * @param {object} params Runner options.
 * @param {(input: string, init?: object) => Promise<FetchResponse>} params.fetchFn Fetch implementation.
 * @param {() => string} params.randomUUID UUID generator.
 * @param {((message: string, error?: unknown) => void) | undefined} [params.consoleError] Logger.
 * @param {{ host: string, url: string }} params.config Invalidation configuration.
 * @returns {(paths: string[]) => Promise<void>} Invalidation handler.
 */
function createPathInvalidationRunner({
  fetchFn,
  randomUUID,
  consoleError,
  config,
}) {
  return async function invalidatePaths(paths) {
    if (!isValidPaths(paths)) {
      return;
    }

    const token = await getAccessToken(fetchFn);

    await Promise.all(
      paths.map(path =>
        invalidatePathItem({
          path,
          token,
          url: config.url,
          host: config.host,
          fetchFn,
          randomUUID,
          consoleError,
        })
      )
    );
  };
}

/**
 * Acquire an access token from the metadata service.
 * @param {(input: string, init?: object) => Promise<FetchResponse>} fetchFn Fetch implementation.
 * @returns {Promise<string>} OAuth access token.
 */
async function getAccessToken(fetchFn) {
  const response = await fetchFn(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );

  ensureResponseOk(response, 'metadata token');

  return extractAccessToken(response);
}

/**
 * Throw when the response is not successful.
 * @param {FetchResponse} response Fetch response to inspect.
 * @param {string} label Context label for the thrown error.
 * @returns {void}
 */
function ensureResponseOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
}

/**
 * Extract the access token string from the metadata response.
 * @param {FetchResponse} response Response that contains JSON with an access_token property.
 * @returns {Promise<string>} Resolved token string.
 */
async function extractAccessToken(response) {
  const { access_token: accessToken } = await response.json();
  return accessToken;
}

/**
 * Send an invalidation request for a single path item.
 * @param {object} options Invalidation helpers.
 * @param {string} options.path CDN path to invalidate.
 * @param {string} options.token OAuth bearer token.
 * @param {string} options.url Compute URL map invalidation endpoint.
 * @param {string} options.host CDN host name.
 * @param {(input: string, init?: object) => Promise<FetchResponse>} options.fetchFn Fetch implementation.
 * @param {() => string} options.randomUUID UUID generator for request IDs.
 * @param {((message: string, ...optionalParams: unknown[]) => void) | undefined} [options.consoleError] Error logger.
 * @returns {Promise<void>} Resolves when the invalidation request completes.
 */
async function invalidatePathItem({
  path,
  token,
  url,
  host,
  fetchFn,
  randomUUID,
  consoleError,
}) {
  return fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      host,
      path,
      requestId: randomUUID(),
    }),
  })
    .then(response => logInvalidateResponse(response, path, consoleError))
    .catch(error => {
      handleInvalidateError(error, path, consoleError);
    });
}

/**
 * Log invalidation failures when the response is not OK.
 * @param {FetchResponse} response Fetch response object.
 * @param {string} path Path that was invalidated.
 * @param {((message: string, ...optionalParams: unknown[]) => void) | undefined} consoleError Optional error logger.
 * @returns {void}
 */
function logInvalidateResponse(response, path, consoleError) {
  if (response.ok) {
    return;
  }
  logInvalidateFailure(path, response.status, consoleError);
}

/**
 * Report an invalidation error when the logger is available.
 * @param {string} path CDN path.
 * @param {number} status HTTP status code.
 * @param {((message: string, ...optionalParams: unknown[]) => void) | undefined} consoleError Optional logger.
 * @returns {void}
 */
function logInvalidateFailure(path, status, consoleError) {
  consoleError?.(`invalidate ${path} failed: ${status}`);
}

/**
 * Report invalidation errors via the provided logger.
 * @param {unknown} error Error or rejection reason.
 * @param {string} path Path that triggered the failure.
 * @param {((message: string, ...optionalParams: unknown[]) => void) | undefined} consoleError Optional logger.
 * @returns {void}
 */
function handleInvalidateError(error, path, consoleError) {
  consoleError?.(`invalidate ${path} error`, extractMessageFromError(error));
}

/**
 * Normalize an error into a displayable message string.
 * @param {unknown} error Error-like value.
 * @returns {string|unknown} Message extracted from the error or the original value.
 */
function extractMessageFromError(error) {
  const message = getMessageFromError(error);
  if (message !== undefined) {
    return message;
  }
  return error;
}

/**
 * Try to read a message string from an error-like value.
 * @param {unknown} error Error candidate.
 * @returns {string|undefined} Message string when present.
 */
function getMessageFromError(error) {
  if (!hasStringMessage(error)) {
    return undefined;
  }
  return error.message;
}

/**
 * Determine whether a value represents an error object with a string message.
 * @param {unknown} value Candidate value.
 * @returns {value is { message: string }} True when the payload exposes a string message.
 */
function hasStringMessage(value) {
  return isObject(value) && isStringMessage(value.message);
}

/**
 * Detect whether the candidate value is an object.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when the input is a non-null object.
 */
function isObject(value) {
  return value !== null && typeof value === 'object';
}

/**
 * Detect whether the candidate value is a string message.
 * @param {unknown} candidate Candidate value.
 * @returns {candidate is string} True when the input is a string.
 */
function isStringMessage(candidate) {
  return typeof candidate === 'string';
}

/**
 * Create the primary render function that updates the moderation contents listing.
 * @param {RenderOptions} options Dependencies required to render content pages.
 * @returns {(deps?: RenderDependencies) => Promise<null>} Renderer.
 */
export function createRenderContents(options) {
  const normalized = normalizeRenderContentsOptions(options);
  return instantiateRenderContents(normalized);
}

/**
 * Normalize incoming render dependencies so assertions and defaults are grouped together.
 * @param {Partial<RenderOptions>} params Raw dependencies supplied by callers.
 * @returns {RenderOptions} Dependencies with defaults and validation applied.
 */
function normalizeRenderContentsOptions(
  params = /** @type {RenderOptions} */ ({})
) {
  const {
    db,
    storage,
    fetchFn,
    randomUUID,
    projectId,
    urlMapName,
    cdnHost,
    consoleError,
    bucketName,
    pageSize,
  } = params;

  assertStorage(/** @type {StorageInstance} */ (storage));
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  return {
    db: /** @type {DbInstance | undefined} */ (db),
    storage: /** @type {StorageInstance} */ (storage),
    fetchFn:
      /** @type {(input: string, init?: object) => Promise<FetchResponse>} */ (
        fetchFn
      ),
    randomUUID: /** @type {() => string} */ (randomUUID),
    projectId,
    urlMapName,
    cdnHost,
    consoleError: resolveRenderContentsConsoleError(consoleError),
    bucketName: resolveRenderContentsBucketName(bucketName),
    pageSize: resolveRenderContentsPageSize(pageSize),
  };
}

/**
 * Ensure a console error helper is available for logging.
 * @param {((message: string, error?: unknown) => void) | undefined} value Candidate logger.
 * @returns {(message: string, error?: unknown) => void} Resolved console error helper.
 */
function resolveRenderContentsConsoleError(value) {
  return value ?? console.error.bind(console) ?? console.error;
}

/**
 * Normalize the bucket name for rendered content.
 * @param {string | undefined} value Candidate bucket name.
 * @returns {string} Bucket name that should be used.
 */
function resolveRenderContentsBucketName(value) {
  return value ?? DEFAULT_BUCKET_NAME;
}

/**
 * Normalize the page size used when paginating rendered content.
 * @param {number | undefined} value Candidate page size.
 * @returns {number} Page size that should be used.
 */
function resolveRenderContentsPageSize(value) {
  const resolved = value ?? DEFAULT_PAGE_SIZE;
  return /** @type {number} */ (resolved);
}

/**
 * Instantiate the renderer after defaults and validations are applied.
 * @param {RenderOptions} deps Normalized render dependencies.
 * @returns {(deps?: RenderDependencies) => Promise<null>} Renderer factory.
 */
function instantiateRenderContents(deps) {
  const {
    db,
    storage,
    fetchFn,
    randomUUID,
    projectId,
    urlMapName,
    cdnHost,
    consoleError,
    bucketName,
    pageSize,
  } = deps;

  const bucket = /** @type {StorageInstance} */ (storage).bucket(bucketName);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError,
  });

  return createRenderContentsHandler({
    db: /** @type {DbInstance} */ (db),
    bucket,
    invalidatePaths,
    pageSize: /** @type {number} */ (pageSize),
  });
}

/**
 * @typedef {object} BucketFileAccessor
 * @property {(path: string) => { save: (content: string, options: object) => Promise<unknown> }} file File accessor.
 */

/**
 * @typedef {object} RenderContentsHandlerConfig
 * @property {DbInstance} db Firestore instance.
 * @property {BucketFileAccessor} bucket Storage bucket file accessor.
 * @property {(paths: string[]) => Promise<void>} invalidatePaths Path invalidation function.
 * @property {number} pageSize Number of items per page.
 */

/**
 * Build the renderer closure that caches fetchers between invocations.
 * @param {RenderContentsHandlerConfig} config Handler dependencies.
 * @returns {(deps?: RenderDependencies) => Promise<null>} Renderer factory.
 */
function createRenderContentsHandler(config) {
  const { db, bucket, invalidatePaths, pageSize } = config;

  /** @type {(() => Promise<string[]>) | undefined} */
  let fetchTopStoryIds;
  /** @type {((storyId: string) => Promise<StoryInfo | null>) | undefined} */
  let fetchStoryInfo;

  return async function render(deps = {}) {
    const loadStoryIds = /** @type {() => Promise<string[]>} */ (
      resolveFetcher({
        provided: deps.fetchTopStoryIds,
        cache: fetchTopStoryIds,
        setCache: value => {
          fetchTopStoryIds = value;
        },
        factory: createFetchTopStoryIds,
        db,
      })
    );

    const loadStoryInfo =
      /** @type {(storyId: string) => Promise<StoryInfo | null>} */ (
        resolveFetcher({
          provided: deps.fetchStoryInfo,
          cache: fetchStoryInfo,
          setCache: value => {
            fetchStoryInfo = value;
          },
          factory: createFetchStoryInfo,
          db,
        })
      );

    const items = await buildStoryItems(loadStoryIds, loadStoryInfo);
    const paths = await publishStoryPages({
      items,
      pageSize,
      bucket,
    });

    await invalidatePaths(paths);
    return null;
  };
}

/**
 * Resolve an asynchronous fetcher from the provided override or cached factory.
 * @param {{
 *   provided?: Function,
 *   cache?: Function,
 *   setCache: (fn: any) => void,
 *   factory: (db: { collection: Function }) => Function,
 *   db?: { collection: Function }
 * }} options Fetcher resolution inputs.
 * @returns {Function} Fetch implementation to use.
 */
function resolveFetcher({ provided, cache, setCache, factory, db: database }) {
  if (typeof provided === 'function') {
    return provided;
  }

  return getOrCreateFetcher({ cache, database, factory, setCache });
}

/**
 * Return the cached fetcher or create a new one via the factory helper.
 * @param {{
 *   cache?: Function,
 *   database?: { collection: Function },
 *   factory: (db: { collection: Function }) => Function,
 *   setCache: (fn: any) => void
 * }} options Fetcher lookup inputs.
 * @returns {Function} Fetch implementation.
 */
function getOrCreateFetcher({ cache, database, factory, setCache }) {
  if (cache) {
    return cache;
  }
  return createFetcherFromDatabase(database, factory, setCache);
}

/**
 * Build story metadata items from Story ID loaders.
 * @param {() => Promise<string[]>} loadIds Loader returning top story identifiers.
 * @param {(id: string) => Promise<StoryInfo | null>} loadInfo Loader returning story metadata.
 * @returns {Promise<StoryInfo[]>} Collected story data.
 */
async function buildStoryItems(loadIds, loadInfo) {
  const ids = await loadIds();
  /** @type {StoryInfo[]} */
  const items = [];

  for (const id of ids) {
    const info = await loadInfo(id);
    pushIfPresent(items, info);
  }

  return items;
}

/**
 * Append the provided value when it is present.
 * @param {StoryInfo[]} collection Array collecting items.
 * @param {StoryInfo | null} value Item to add when truthy.
 * @returns {void}
 */
function pushIfPresent(collection, value) {
  if (value) {
    collection.push(value);
  }
}

/**
 * Write paginated story HTML to storage and return invalidation paths.
 * @param {{
 *   items: StoryInfo[],
 *   pageSize: number,
 *   bucket: { file: (path: string) => { save: (content: string, options: object) => Promise<unknown> } }
 * }} options Publishing inputs.
 * @returns {Promise<string[]>} Paths that were saved.
 */
async function publishStoryPages({
  items,
  pageSize: size,
  bucket: targetBucket,
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const paths = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const start = (page - 1) * size;
    const pageItems = items.slice(start, start + size);
    const html = buildHtml(pageItems);
    const filePath = resolvePageFilePath(page);
    const options = buildPageSaveOptions(page, totalPages);

    await targetBucket.file(filePath).save(html, options);
    paths.push(`/${filePath}`);
  }

  return paths;
}

/**
 * Resolve the file path used for a rendered contents page.
 * @param {number} pageNumber Page index being written.
 * @returns {string} Storage path for the rendered page.
 */
function resolvePageFilePath(pageNumber) {
  if (pageNumber === 1) {
    return 'index.html';
  }
  return `contents/${pageNumber}.html`;
}

/**
 * Build the storage options for a rendered contents page.
 * @param {number} pageNumber Current page number being written.
 * @param {number} maxPages Total number of pages to determine caching behavior.
 * @returns {{ contentType: string, metadata?: { cacheControl: string } }} Storage options.
 */
function buildPageSaveOptions(pageNumber, maxPages) {
  /** @type {{ contentType: string, metadata?: { cacheControl: string } }} */
  const options = { contentType: 'text/html' };
  if (pageNumber === maxPages) {
    options.metadata = { cacheControl: 'no-cache' };
  }
  return options;
}

/**
 * Create a cached fetcher when none is provided.
 * @param {DbInstance | undefined} database Firestore-like instance used by the factory.
 * @param {(db: DbInstance) => Function} factory Factory that produces the fetcher.
 * @param {(fn: Function) => void} setCache Setter for caching the created fetcher.
 * @returns {Function} Newly created fetch implementation.
 */
function createFetcherFromDatabase(database, factory, setCache) {
  assertDb(/** @type {DbInstance} */ (database));
  const created = factory(/** @type {DbInstance} */ (database));
  setCache(created);
  return created;
}

/**
 * Resolve the list of allowed origins for the render-contents endpoint.
 * @param {{ [key: string]: string | undefined } | undefined} environmentVariables Environment variables map.
 * @returns {string[]} Whitelist of allowed origins.
 */
export function getAllowedOrigins(environmentVariables) {
  const configuredOrigins =
    environmentVariables &&
    environmentVariables.RENDER_CONTENTS_ALLOWED_ORIGINS;
  const parsedOrigins = parseAllowedOrigins(configuredOrigins);
  return chooseAllowedOrigins(parsedOrigins);
}

/**
 * Parse a comma-separated list of allowed origins from the environment value.
 * @param {string | undefined} value Raw environment value containing origins.
 * @returns {string[]} Normalized list of allowed origins.
 */
function parseAllowedOrigins(value) {
  const normalized = normalizeAllowedOriginsValue(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

/**
 * Normalize the raw environment string used for allowed origins.
 * @param {string | undefined} value Candidate origin list string.
 * @returns {string} Trimmed string or empty string when invalid.
 */
function normalizeAllowedOriginsValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/**
 * Select the origins list that should be returned to callers.
 * @param {string[]} parsedOrigins Parsed configuration origins.
 * @returns {string[]} Either the parsed origins or the production fallback.
 */
function chooseAllowedOrigins(parsedOrigins) {
  if (parsedOrigins.length > 0) {
    return parsedOrigins;
  }

  return [...productionOrigins];
}

/**
 * @typedef {object} NativeHttpResponseWithSet
 * @property {(name: string, value: string) => void} set Set response header.
 * @property {Function} [status] Set response status.
 */

/**
 * Create a helper that applies CORS headers to outgoing responses.
 * @param {{ allowedOrigins?: string[] }} root0 Options for configuring origins.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponseWithSet) => boolean} Header applier returning whether the origin is allowed.
 */
export function createApplyCorsHeaders({ allowedOrigins }) {
  /** @type {string[]} */
  let origins;
  if (Array.isArray(allowedOrigins)) {
    origins = allowedOrigins;
  } else {
    origins = [];
  }

  return function applyCorsHeaders(req, res) {
    const origin = resolveOriginHeader(req);
    const originAllowed = respondToOrigin(res, origin, origins);
    setStaticCorsHeaders(res);
    return originAllowed;
  };
}

/**
 * Extract the Origin header when available on the request object.
 * @param {NativeHttpRequest} req Request-like helper.
 * @returns {unknown} Origin header string, when present.
 */
function resolveOriginHeader(req) {
  return callHeaderGetter(req?.get, 'Origin');
}

/**
 * Apply the appropriate Access-Control response based on the resolved origin.
 * @param {{ set: (name: string, value: string) => void }} res Response helper.
 * @param {unknown} origin Origin header value.
 * @param {string[]} origins Allowlist of origins.
 * @returns {boolean} True when the origin is considered allowed.
 */
function respondToOrigin(res, origin, origins) {
  if (!origin || typeof origin !== 'string') {
    setWildcardOrigin(res);
    return true;
  }
  return handleKnownOrigin(res, origin, origins);
}

/**
 * Apply origin-specific headers for allowed or denied origins.
 * @param {{ set: (name: string, value: string) => void }} res Response helper.
 * @param {string} origin Incoming origin header.
 * @param {string[]} origins Allowlist of origins.
 * @returns {boolean} True when the origin is permitted.
 */
function handleKnownOrigin(res, origin, origins) {
  if (origins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    return true;
  }

  res.set('Access-Control-Allow-Origin', 'null');
  res.set('Vary', 'Origin');
  return false;
}

/**
 * Apply a wildcard Access-Control-Allow-Origin header when no origin is provided.
 * @param {{ set: (name: string, value: string) => void }} res Response helper.
 * @returns {void}
 */
function setWildcardOrigin(res) {
  res.set('Access-Control-Allow-Origin', '*');
}

/**
 * Set headers that are constant regardless of origin.
 * @param {{ set: (name: string, value: string) => void }} res Response helper.
 * @returns {void}
 */
function setStaticCorsHeaders(res) {
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization');
}

/**
 * @typedef {object} ResponseWithStatusSend
 * @property {(code: number) => { send: (body: string) => void }} status Set response status.
 * @property {(body: string) => void} send Send response.
 */

/**
 * Create a request validator that ensures CORS and method requirements.
 * @param {{ applyCorsHeaders: (req: NativeHttpRequest, res: NativeHttpResponseWithSet & ResponseWithStatusSend) => boolean }} root0 Dependencies.
 * @returns {(req: NativeHttpRequest, res: ResponseWithStatusSend) => boolean} Validator indicating if the request should continue.
 */
export function createValidateRequest({ applyCorsHeaders }) {
  assertFunction(applyCorsHeaders, 'applyCorsHeaders');

  return function validateRequest(req, res) {
    const originAllowed = applyCorsHeaders(
      req,
      /** @type {NativeHttpResponseWithSet & ResponseWithStatusSend} */ (res)
    );

    if (handlePreflight(req, res, originAllowed)) {
      return false;
    }

    return ensureOriginAndMethodAllowed(req, res, originAllowed);
  };
}

/**
 * Handle OPTIONS preflight requests.
 * @param {NativeHttpRequest} req Incoming request.
 * @param {ResponseWithStatusSend} res Response helper.
 * @param {boolean} originAllowed Whether the request origin passed CORS checks.
 * @returns {boolean} True when the request was handled and no further processing is needed.
 */
function handlePreflight(req, res, originAllowed) {
  if (!isOptionsRequest(req)) {
    return false;
  }

  respondToPreflight(res, originAllowed);
  return true;
}

/**
 * Send the preflight response body and status.
 * @param {ResponseWithStatusSend} res Response helper.
 * @param {boolean} originAllowed Whether the origin was authorized.
 * @returns {void}
 */
function respondToPreflight(res, originAllowed) {
  if (originAllowed) {
    res.status(204).send('');
    return;
  }

  res.status(403).send('');
}

/**
 * Enforce that the origin is allowed and the method is POST.
 * @param {NativeHttpRequest} req Incoming request helper.
 * @param {ResponseWithStatusSend} res Response helper.
 * @param {boolean} originAllowed Whether the origin is allowed.
 * @returns {boolean} True when the request should continue.
 */
function ensureOriginAndMethodAllowed(req, res, originAllowed) {
  if (!originAllowed) {
    res.status(403).send('CORS');
    return false;
  }
  return ensurePostMethod(req, res);
}

/**
 * Ensure the request uses the POST method.
 * @param {NativeHttpRequest} req Request helper.
 * @param {ResponseWithStatusSend} res Response helper.
 * @returns {boolean} True when the method is POST.
 */
function ensurePostMethod(req, res) {
  if (isPostRequest(req)) {
    return true;
  }

  res.status(405).send('POST only');
  return false;
}

/**
 * Check whether the incoming request is an OPTIONS preflight.
 * @param {NativeHttpRequest | undefined} req Incoming request object.
 * @returns {boolean} True when the method is OPTIONS.
 */
function isOptionsRequest(req) {
  return req?.method === 'OPTIONS';
}

/**
 * Confirm the request uses the POST method.
 * @param {NativeHttpRequest | undefined} req Incoming request object.
 * @returns {boolean} True when the method is POST.
 */
function isPostRequest(req) {
  return req?.method === 'POST';
}

/**
 * Extract the Authorization header via the request getter.
 * @param {NativeHttpRequest} req Incoming request-like object that provides `get`.
 * @returns {unknown} Value returned by {@code req.get('Authorization')} or {@code req.get('authorization')}.
 */
function getAuthorizationHeaderFromGetter(req) {
  const getter = /** @type {((name: string) => unknown) | undefined} */ (
    req.get
  );
  const authorizationHeader = callHeaderGetter(getter, 'Authorization');
  if (isDefined(authorizationHeader)) {
    return authorizationHeader;
  }

  return callHeaderGetter(getter, 'authorization');
}

/**
 * Determine whether the provided value is neither undefined nor null.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is defined.
 */
function isDefined(value) {
  return value !== undefined && value !== null;
}

/**
 * Resolve the Authorization header from a request-like object.
 * @param {NativeHttpRequest} req Incoming request object.
 * @returns {string} Authorization header or an empty string.
 */
export function resolveAuthorizationHeader(req) {
  const getterHeader = normalizeHeaderCandidate(
    getAuthorizationHeaderFromGetter(req)
  );
  if (getterHeader) {
    return getterHeader;
  }

  return normalizeHeaderCandidate(getHeaderFromHeaders(req));
}

/**
 * Safely invoke a header getter when a function is provided.
 * @param {(((name: string) => unknown) | undefined)} getter Header getter helper.
 * @param {string} key Header name to read.
 * @returns {unknown} Header value when available.
 */
function callHeaderGetter(getter, key) {
  if (typeof getter !== 'function') {
    return undefined;
  }

  return getter(key);
}

/**
 * Normalize an authorization header candidate into a string.
 * @param {unknown} value Candidate header value.
 * @returns {string} Header string when valid or empty string otherwise.
 */
function normalizeHeaderCandidate(value) {
  if (isNonEmptyString(value)) {
    return value;
  }

  return '';
}

/**
 * Read the Authorization header when it lives in the request headers map.
 * @param {NativeHttpRequest} req Request holding the headers object.
 * @returns {unknown} Authorization header value when present.
 */
export function getHeaderFromHeaders(req) {
  if (!hasHeaders(req)) {
    return undefined;
  }

  return resolveHeaderValue(req.headers);
}

/**
 * Read and normalize the Authorization header value from a header map.
 * @param {{ Authorization?: unknown, authorization?: unknown } | undefined} headers Header map value.
 * @returns {unknown} Header value when present; otherwise undefined.
 */
export function resolveHeaderValue(headers) {
  return getAuthorizationValue(headers);
}

/**
 * Retrieve the authorization header value from the provided headers map.
 * @param {{ Authorization?: unknown, authorization?: unknown } | undefined} headers Candidate headers object.
 * @returns {unknown} Header value when present; otherwise `undefined`.
 */
function getAuthorizationValue(headers) {
  if (!headers) {
    return undefined;
  }

  return getAuthorizationCandidate(headers);
}

/**
 * Look up the authorization candidate on the headers map.
 * @param {{ Authorization?: unknown, authorization?: unknown }} headers Header map guaranteed to be defined.
 * @returns {unknown} Authorization header value when present; otherwise `undefined`.
 */
function getAuthorizationCandidate(headers) {
  return headers.Authorization ?? headers.authorization;
}

/**
 * Determine whether the provided request contains headers.
 * @param {NativeHttpRequest | undefined} req Request-like helper.
 * @returns {boolean} True when the request exposes a headers object.
 */
function hasHeaders(req) {
  return Boolean(req?.headers);
}

/**
 * Extract the bearer token from an authorization header string.
 * @param {string} header Authorization header.
 * @returns {string} Bearer token or an empty string if none found.
 */
function extractBearerToken(header) {
  const headerValue = String(header);
  const match = headerValue.match(/^Bearer (.+)$/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * Create the helper that validates the Authorization header against an admin user.
 * @param {{
 *   verifyIdToken: (token: string) => Promise<{ uid?: string }>,
 *   adminUid: string
 * }} root0 - Authorization dependencies.
 * @returns {(options: { req: NativeHttpRequest, res: ResponseWithStatusSend }) => Promise<{ uid?: string } | null>} Authorization checker.
 */
export function createAuthorizeRequest({ verifyIdToken, adminUid }) {
  assertFunction(verifyIdToken, 'verifyIdToken');

  if (!adminUid) {
    throw new TypeError('adminUid must be provided');
  }

  return async function authorizeRequest({ req, res }) {
    const header = resolveAuthorizationHeader(req);
    const token = extractBearerToken(header);

    if (!token) {
      res.status(401).send('Missing token');
      return null;
    }

    return verifyIdToken(token)
      .then(decoded => ensureAdminIdentity(decoded, adminUid, res))
      .catch(error => handleAuthError(error, res));
  };
}

/**
 * Confirm the decoded token matches the configured admin UID.
 * @param {{ uid?: string } | null} decoded Decoded token payload.
 * @param {string} adminUid Expected admin user ID.
 * @param {ResponseWithStatusSend} res Response helper.
 * @returns {{ uid?: string } | null} Decoded payload when the UID matches.
 */
function ensureAdminIdentity(decoded, adminUid, res) {
  if (isInvalidAdminIdentity(decoded, adminUid)) {
    res.status(403).send('Forbidden');
    return null;
  }

  return decoded;
}

/**
 * Determine whether the decoded token is missing or does not match the expected admin UID.
 * @param {{ uid?: string } | null} decoded Decoded token payload.
 * @param {string} adminUid Expected admin user identifier.
 * @returns {boolean} True when the decoded payload is invalid for admin use.
 */
function isInvalidAdminIdentity(decoded, adminUid) {
  return !decoded || decoded.uid !== adminUid;
}

/**
 * Respond to verification failures with a standard error body.
 * @param {unknown} error Error produced by the verifier.
 * @param {ResponseWithStatusSend} res Response helper.
 * @returns {null} Always returns null so the caller can abort processing.
 */
function handleAuthError(error, res) {
  const message = extractMessageFromError(error);
  res.status(401).send(formatInvalidTokenMessage(message));
  return null;
}

/**
 * Pick a payload for authorization failures.
 * @param {unknown} message Candidate message produced by the verifier.
 * @returns {string} Value emitted to the client.
 */
function formatInvalidTokenMessage(message) {
  if (hasNonEmptyString(message)) {
    return message;
  }

  return 'Invalid token';
}

/**
 * Confirm the candidate is a non-empty string.
 * @param {unknown} input Candidate value.
 * @returns {input is string} True when the input is a non-empty string.
 */
function hasNonEmptyString(input) {
  if (typeof input !== 'string') {
    return false;
  }

  return input.length > 0;
}

/**
 * Build a render-request handler bound to the shared authorization extractor.
 * @param {object} root0 Handler dependencies.
 * @param {(req: { method?: string }, res: { status: Function, send: Function }) => boolean} root0.validateRequest Pre-flight validator.
 * @param {(token: string) => Promise<{ uid?: string }>} root0.verifyIdToken Firebase token verifier.
 * @param {string} root0.adminUid UID allowed to trigger rendering.
 * @param {() => Promise<void>} root0.render Rendering function.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Fully wired handler.
 */
export function buildHandleRenderRequest({
  validateRequest,
  verifyIdToken,
  adminUid,
  render,
}) {
  assertFunction(validateRequest, 'validateRequest');
  assertFunction(render, 'render');

  const authorizeRequest = createAuthorizeRequest({
    verifyIdToken,
    adminUid,
  });

  /**
   * Guard the render workflow by ensuring the request is authorized.
   * @param {NativeHttpRequest} req - Request forwarded from the HTTP handler.
   * @param {NativeHttpResponse} res - Response object used to send errors or success.
   * @returns {Promise<void>}
   */
  async function executeRenderRequest(req, res) {
    const decoded = await authorizeRequest({ req, res });

    if (decoded) {
      await executeRenderRequestAfterGuard(res);
    }
  }

  /**
   * Actually run the render helper and send the final response.
   * @param {NativeHttpResponse} res - Response object for success/failure updates.
   * @returns {Promise<void>}
   */
  function executeRenderRequestAfterGuard(res) {
    return render()
      .then(() => {
        sendOkResponse(res);
      })
      .catch(error => handleRenderFailure(res, error));
  }

  /**
   * Send the failure response when rendering fails.
   * @param {{ status: (code: number) => { json: (body: object) => void } }} res Response object used to send errors.
   * @param {unknown} error Error thrown by the renderer.
   * @returns {void}
   */
  function handleRenderFailure(res, error) {
    const message = extractMessageFromError(error);
    res.status(500).json({ error: resolveRenderFailureMessage(message) });
  }

  /**
   * Choose a user-facing error message when rendering fails.
   * @param {unknown} message Candidate message produced by the renderer.
   * @returns {string} Message returned to the client.
   */
  function resolveRenderFailureMessage(message) {
    if (hasNonEmptyString(message)) {
      return message;
    }

    return 'render failed';
  }

  return async function handleRenderRequest(req, res) {
    if (validateRequest(req, res)) {
      await executeRenderRequest(req, res);
    }
  };
}

export { handleInvalidateError, ensureAdminIdentity };
