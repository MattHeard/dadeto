import {
  assertFunction,
  DEFAULT_BUCKET_NAME,
  productionOrigins,
} from './cloud-core.js';
export { DEFAULT_BUCKET_NAME, productionOrigins };
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
 * @param {number|string} pageNumber Identifier for the story page.
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
 * @param {{ pageNumber: number|string, title: string }[]} items Story info items to render.
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

    return snapshot.docs.map(doc => doc.id);
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
 * @returns {StoryInfo | null} Story info with title and page number or null when missing.
 */
function buildStoryInfoFromSnap(storySnap) {
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
  const rootRef = story?.rootPage;
  return rootRef ? resolveStoryInfoFromRoot(rootRef, story) : null;
}

/**
 * Resolve the root page data for the story.
 * @param {{ get: () => Promise<{ exists: boolean, data: () => Record<string, any> }> }} rootRef Document reference for the root page.
 * @param {Record<string, any>} story Firestore story document data.
 * @returns {Promise<StoryInfo | null>} Story info describing title and page number.
 */
async function resolveStoryInfoFromRoot(rootRef, story) {
  const pageSnap = await rootRef.get();
  return buildStoryInfoFromPage(pageSnap, story);
}

/**
 * Build story info from a retrieved page snapshot.
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
    pageNumber: extractPageNumber(page),
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
 * Extract story title.
 * @param {Record<string, any>} story Story.
 * @returns {string} Title.
 */
function extractStoryTitle(story) {
  if (story && typeof story.title === 'string') {
    return story.title;
  }

  return '';
}

/**
 * Extract page number.
 * @param {Record<string, any>} page Page.
 * @returns {number | undefined} Page number.
 */
function extractPageNumber(page) {
  if (page && typeof page.number === 'number') {
    return page.number;
  }

  return undefined;
}

/**
 * Create a helper for invalidating cached CDN paths.
 * @param {object} root0 Options for the invalidation routine.
 * @param {(input: string, init?: object) => Promise<{ ok: boolean, status: number, json: () => Promise<any> }>} root0.fetchFn Fetch-like implementation.
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
 *
 * @param cdnHost
 */
function resolveCdnHost(cdnHost) {
  return cdnHost || 'www.dendritestories.co.nz';
}

/**
 *
 * @param projectId
 * @param urlMapName
 */
function buildInvalidateUrl(projectId, urlMapName) {
  const projectSegment = projectId ? `projects/${projectId}` : 'projects';
  const urlMap = urlMapName || 'prod-dendrite-url-map';

  return `https://compute.googleapis.com/compute/v1/${projectSegment}/global/urlMaps/${urlMap}/invalidateCache`;
}

/**
 * Create the actual path invalidation routine.
 * @param {object} params Runner options.
 * @param {(input: string, init?: object) => Promise<Response>} params.fetchFn Fetch implementation.
 * @param {() => string} params.randomUUID UUID generator.
 * @param {(message: string, error?: unknown) => void} [params.consoleError] Logger.
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
 * @param {(input: string, init?: object) => Promise<Response>} fetchFn Fetch implementation.
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
 * @param {Response} response Fetch response to inspect.
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
 * @param {Response} response Response that contains JSON with an access_token property.
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
 * @param {(input: string, init?: object) => Promise<Response>} options.fetchFn Fetch implementation.
 * @param {() => string} options.randomUUID UUID generator for request IDs.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [options.consoleError] Error logger.
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
 * @param {Response} response Fetch response object.
 * @param {string} path Path that was invalidated.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional error logger.
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
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional logger.
 * @returns {void}
 */
function logInvalidateFailure(path, status, consoleError) {
  if (!consoleError) {
    return;
  }
  consoleError(`invalidate ${path} failed: ${status}`);
}

/**
 * Report invalidation errors via the provided logger.
 * @param {unknown} error Error or rejection reason.
 * @param {string} path Path that triggered the failure.
 * @param {(message: string, ...optionalParams: unknown[]) => void} [consoleError] Optional logger.
 * @returns {void}
 */
function handleInvalidateError(error, path, consoleError) {
  if (!consoleError) {
    return;
  }
  consoleError(`invalidate ${path} error`, extractMessageFromError(error));
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
 * @param {object} root0 Dependencies required to render content pages.
 * @param {{ collection: Function }} [root0.db] Firestore-like instance used for lookup helpers.
 * @param {{ bucket: Function }} root0.storage Cloud storage-like instance.
 * @param {(input: string, init?: object) => Promise<{ ok: boolean, status: number, json: () => Promise<any> }>} root0.fetchFn Fetch implementation.
 * @param {() => string} root0.randomUUID UUID generator for cache invalidation.
 * @param {string} [root0.projectId] Google Cloud project identifier.
 * @param {string} [root0.urlMapName] Compute URL map identifier.
 * @param {string} [root0.cdnHost] CDN host name used for invalidation requests.
 * @param {(message: string, error?: unknown) => void} [root0.consoleError] Logger for invalidate failures.
 * @param {string} [root0.bucketName] Target bucket name for rendered files.
 * @param {number} [root0.pageSize] Number of items per generated page.
 * @returns {(deps?: RenderDependencies) => Promise<null>} Renderer.
 */
export function createRenderContents({
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
}) {
  assertStorage(storage);
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const resolvedConsoleError = consoleError ?? console.error;
  const resolvedBucketName = bucketName ?? DEFAULT_BUCKET_NAME;
  const resolvedPageSize = pageSize ?? DEFAULT_PAGE_SIZE;

  const bucket = storage.bucket(resolvedBucketName);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError: resolvedConsoleError,
  });

  let fetchTopStoryIds;
  let fetchStoryInfo;

  /**
   * Resolve an asynchronous fetcher from provided dependencies or cached factories.
   * @param {{
   *   provided: (() => Promise<any[]>) | undefined,
   *   cache: (() => Promise<any[]>) | undefined,
   *   setCache: (fn: () => Promise<any[]>) => void,
   *   factory: (db: { collection: Function }) => () => Promise<any[]>,
   *   db: { collection?: Function } | undefined
   * }} options Fetcher resolution inputs.
   * @returns {() => Promise<any[]>} Fetch implementation to use.
   */
  function resolveFetcher({
    provided,
    cache,
    setCache,
    factory,
    db: database,
  }) {
    if (typeof provided === 'function') {
      return provided;
    }

    return getOrCreateFetcher({ cache, database, factory, setCache });
  }

  /**
   * Return the cached fetcher or create a new one via the factory.
   * @param {(() => Promise<any[]>) | undefined} cache Cached fetcher.
   * @param {{ collection?: Function } | undefined} database Database dependency.
   * @param {(db: { collection: Function }) => () => Promise<any[]>} factory Fetcher factory.
   * @param {(fn: () => Promise<any[]>) => void} setCache Cache setter.
   * @returns {() => Promise<any[]>} Fetch implementation.
   */
  /**
   * Return the existing fetcher or create and cache a new one.
   * @param {{ cache?: () => Promise<any[]>, database?: { collection?: Function }, factory: (db: { collection: Function }) => () => Promise<any[]>, setCache: (fn: () => Promise<any[]>) => void }} options Lookup inputs.
   * @returns {() => Promise<any[]>} Fetch implementation.
   */
  function getOrCreateFetcher({ cache, database, factory, setCache }) {
    if (cache) {
      return cache;
    }
    return createFetcherFromDatabase(database, factory, setCache);
  }

  /**
   * Load story metadata for rendering.
   * @param {() => Promise<string[]>} loadIds Loader for top story identifiers.
   * @param {(id: string) => Promise<Record<string, any> | null>} loadInfo Loader for story details.
   * @returns {Promise<Record<string, any>[]>} Collected story data.
   */
  async function buildStoryItems(loadIds, loadInfo) {
    const ids = await loadIds();
    const items = [];

    for (const id of ids) {
      const info = await loadInfo(id);
      pushIfPresent(items, info);
    }

    return items;
  }

  /**
   *
   * @param collection
   * @param value
   */
  /**
   * Push values into the collection when they are present.
   * @param {any[]} collection Array accumulating results.
   * @param {any} value Potential item to add.
   * @returns {void}
   */
  function pushIfPresent(collection, value) {
    if (value) {
      collection.push(value);
    }
  }

  /**
   * Publish paginated story listings and return the invalidation paths.
   * @param {{ items: Record<string, any>[], pageSize: number, bucket: { file: (path: string) => { save: Function } } }} options
   * Rendering configuration.
   * @returns {Promise<string[]>} Paths that were written and need invalidation.
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

    /**
     * Generate the file path for a rendered contents page.
     * @param {number} pageNumber Page index being rendered.
     * @returns {string} Storage location for the generated HTML.
     */
    function resolvePageFilePath(pageNumber) {
      if (pageNumber === 1) {
        return 'index.html';
      }
      return `contents/${pageNumber}.html`;
    }

    /**
     * Build the save options for a rendered page file.
     * @param {number} pageNumber Current page index.
     * @param {number} maxPages Total number of pages to determine caching.
     * @returns {{ contentType: string, metadata?: { cacheControl: string } }} Storage options.
     */
    function buildPageSaveOptions(pageNumber, maxPages) {
      const options = { contentType: 'text/html' };
      if (pageNumber === maxPages) {
        options.metadata = { cacheControl: 'no-cache' };
      }
      return options;
    }
  }

  return async function render(deps = {}) {
    const loadStoryIds = resolveFetcher({
      provided: deps.fetchTopStoryIds,
      cache: fetchTopStoryIds,
      setCache: value => {
        fetchTopStoryIds = value;
      },
      factory: createFetchTopStoryIds,
      db,
    });

    const loadStoryInfo = resolveFetcher({
      provided: deps.fetchStoryInfo,
      cache: fetchStoryInfo,
      setCache: value => {
        fetchStoryInfo = value;
      },
      factory: createFetchStoryInfo,
      db,
    });

    const items = await buildStoryItems(loadStoryIds, loadStoryInfo);
    const paths = await publishStoryPages({
      items,
      pageSize: resolvedPageSize,
      bucket,
    });

    await invalidatePaths(paths);
    return null;
  };
}

/**
 *
 * @param database
 * @param factory
 * @param setCache
 */
/**
 * Create a cached fetcher when none is provided.
 * @param {{ collection?: Function }} database Firestore-like instance used by the factory.
 * @param {(db: { collection: Function }) => () => Promise<any[]>} factory Factory that produces the fetcher.
 * @param {(fn: () => Promise<any[]>) => void} setCache Setter for caching the created fetcher.
 * @returns {() => Promise<any[]>} Newly created fetch implementation.
 */
function createFetcherFromDatabase(database, factory, setCache) {
  assertDb(database);
  const created = factory(database);
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
    environmentVariables?.RENDER_CONTENTS_ALLOWED_ORIGINS;
  const parsedOrigins = parseAllowedOrigins(configuredOrigins);
  return chooseAllowedOrigins(parsedOrigins);
}

/**
 *
 * @param value
 */
/**
 * Parse a comma-separated list of allowed origins from an environment variable.
 * @param {string | undefined} value Raw environment value.
 * @returns {string[]} Normalized list of origins.
 */
function parseAllowedOrigins(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
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
 * Create a helper that applies CORS headers to outgoing responses.
 * @param {{ allowedOrigins?: string[] }} root0 Options for configuring origins.
 * @returns {(req: { get?: (name: string) => unknown }, res: { set: Function, status?: Function }) => boolean} Header applier returning whether the origin is allowed.
 */
export function createApplyCorsHeaders({ allowedOrigins }) {
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
 * @param {{ get?: (name: string) => unknown }} req Request-like helper.
 * @returns {string | undefined} Origin header string, when present.
 */
function resolveOriginHeader(req) {
  if (typeof req?.get === 'function') {
    return req.get('Origin');
  }
  return undefined;
}

/**
 * Apply the appropriate Access-Control response based on the resolved origin.
 * @param {{ set: (name: string, value: string) => void }} res Response helper.
 * @param {string | undefined} origin Origin header value.
 * @param {string[]} origins Allowlist of origins.
 * @returns {boolean} True when the origin is considered allowed.
 */
function respondToOrigin(res, origin, origins) {
  if (!origin) {
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
 * Create a request validator that ensures CORS and method requirements.
 * @param {{ applyCorsHeaders: (req: { method?: string, get?: (name: string) => unknown }, res: { set: Function, status: Function, send: Function }) => boolean }} root0 Dependencies.
 * @returns {(req: { method?: string }, res: { status: Function, send: Function }) => boolean} Validator indicating if the request should continue.
 */
export function createValidateRequest({ applyCorsHeaders }) {
  assertFunction(applyCorsHeaders, 'applyCorsHeaders');

  return function validateRequest(req, res) {
    const originAllowed = applyCorsHeaders(req, res);

    if (handlePreflight(req, res, originAllowed)) {
      return false;
    }

    return ensureOriginAndMethodAllowed(req, res, originAllowed);
  };
}

/**
 * Handle OPTIONS preflight requests.
 * @param {{ method?: string }} req Incoming request.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
 * @param {boolean} originAllowed Whether the request origin passed CORS checks.
 * @returns {boolean} True when the request was handled and no further processing is needed.
 */
function handlePreflight(req, res, originAllowed) {
  if (req?.method !== 'OPTIONS') {
    return false;
  }
  respondToPreflight(res, originAllowed);
  return true;
}

/**
 * Send the preflight response body and status.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
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
 * @param {{ method?: string }} req Incoming request helper.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
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
 * @param {{ method?: string }} req Request helper.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
 * @returns {boolean} True when the method is POST.
 */
function ensurePostMethod(req, res) {
  if (req?.method === 'POST') {
    return true;
  }
  res.status(405).send('POST only');
  return false;
}

/**
 * Extract the Authorization header via the request getter.
 * @param {{ get: (name: string) => unknown }} req Incoming request-like object that provides `get`.
 * @returns {unknown} Value returned by {@code req.get('Authorization')} or {@code req.get('authorization')}.
 */
function getAuthorizationHeaderFromGetter(req) {
  return req.get('Authorization') ?? req.get('authorization');
}

/**
 * Resolve the Authorization header from a request-like object.
 * @param {{ get?: (name: string) => unknown, headers?: object }} req Incoming request object.
 * @returns {string} Authorization header or an empty string.
 */
function resolveAuthorizationHeader(req) {
  const getterHeader = normalizeHeaderCandidate(
    getAuthorizationHeaderFromGetter(req)
  );
  if (getterHeader) {
    return getterHeader;
  }

  return normalizeHeaderCandidate(getHeaderFromHeaders(req));
}

/**
 * Normalize an authorization header candidate into a string.
 * @param {unknown} value Candidate header value.
 * @returns {string} Header string when valid or empty string otherwise.
 */
function normalizeHeaderCandidate(value) {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return '';
}

/**
 * Read the Authorization header when it lives in the request headers map.
 * @param {{ headers?: object }} req Request holding the headers object.
 * @returns {unknown} Authorization header value found in the headers object.
 */
function getHeaderFromHeaders(req) {
  return resolveHeaderValue(req?.headers);
}

/**
 * Read the Authorization header value from the provided map.
 * @param {{ Authorization?: unknown, authorization?: unknown } | undefined} headers Header map.
 * @returns {unknown} Header value when present.
 */
function resolveHeaderValue(headers) {
  if (!headers) {
    return undefined;
  }

  return headers.Authorization ?? headers.authorization;
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
 * @returns {(options: { req: { get?: (name: string) => unknown, headers?: object }, res: { status: Function, send: Function } }) => Promise<{ uid?: string } | null>} Authorization checker.
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
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
 * @returns {{ uid?: string } | null} Decoded payload when the UID matches.
 */
function ensureAdminIdentity(decoded, adminUid, res) {
  if (!decoded || decoded.uid !== adminUid) {
    res.status(403).send('Forbidden');
    return null;
  }
  return decoded;
}

/**
 * Respond to verification failures with a standard error body.
 * @param {unknown} error Error produced by the verifier.
 * @param {{ status: (code: number) => { send: (body: string) => void } }} res Response helper.
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
 * @returns {(req: { method?: string }, res: { status: Function, send: Function, json: Function }) => Promise<void>} Fully wired handler.
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
   * @param {import('express').Request} req - Request forwarded from the HTTP handler.
   * @param {import('express').Response} res - Response object used to send errors or success.
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
   * @param {import('express').Response} res - Response object for success/failure updates.
   * @returns {Promise<void>}
   */
  function executeRenderRequestAfterGuard(res) {
    return render()
      .then(() => {
        res.status(200).json({ ok: true });
      })
      .catch(error => {
        const message = extractMessageFromError(error);
        if (typeof message === 'string' && message.length > 0) {
          res.status(500).json({ error: message });
          return;
        }
        res.status(500).json({ error: 'render failed' });
      });
  }

  return async function handleRenderRequest(req, res) {
    if (validateRequest(req, res)) {
      await executeRenderRequest(req, res);
    }
  };
}
