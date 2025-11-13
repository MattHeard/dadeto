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
  if (!db || typeof db.collection !== 'function') {
    throw new TypeError('db must provide a collection helper');
  }
}

/**
 * Ensure the provided Storage-like instance exposes the expected helpers.
 * @param {{ bucket: Function }} storage Storage-like instance to validate.
 * @returns {void}
 */
function assertStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
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

/**
 * Build the full HTML page shell for the contents list.
 * @param {string} list Pre-rendered ordered list markup.
 * @returns {string} Page HTML string.
 */
export const PAGE_HTML = list => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dendrite</title>
    <link rel="icon" href="/favicon.ico" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css"
    />
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
      <h1>Contents</h1>
      <ol class="contents">${list}</ol>
    </main>
    <script src="https://accounts.google.com/gsi/client" defer></script>
    <script type="module">
      import {
        initGoogleSignIn,
        signOut,
        getIdToken,
        isAdmin,
      } from './googleAuth.js';
        const sbs = document.querySelectorAll('#signinButton');
        const sws = document.querySelectorAll('#signoutWrap');
        const sos = document.querySelectorAll('#signoutLink');
        const als = document.querySelectorAll('.admin-link');
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
      initGoogleSignIn({
        onSignIn: showSignedIn,
      });
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
        const toggle = document.querySelector('.menu-toggle');
        const overlay = document.getElementById('mobile-menu');
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
        toggle.addEventListener('click', () => {
          if (overlay.hidden) {
            openMenu();
          } else {
            closeMenu();
          }
        });
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

    if (!storySnap.exists) {
      return null;
    }

    const story = storySnap.data();
    const rootRef = story?.rootPage;

    if (!rootRef) {
      return null;
    }

    const pageSnap = await rootRef.get();

    if (!pageSnap.exists) {
      return null;
    }

    const page = pageSnap.data();

    return {
      title: story?.title || '',
      pageNumber: page?.number,
    };
  };
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
function createInvalidatePaths({
  fetchFn,
  projectId,
  urlMapName,
  cdnHost,
  randomUUID,
  consoleError,
}) {
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const host = cdnHost || 'www.dendritestories.co.nz';
  const urlMap = urlMapName || 'prod-dendrite-url-map';

  /**
   * Resolve the service account access token used to call the compute API.
   * @returns {Promise<string>} OAuth access token for compute operations.
   */
  async function getAccessToken() {
    const response = await fetchFn(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );

    if (!response.ok) {
      throw new Error(`metadata token: HTTP ${response.status}`);
    }

    const { access_token: accessToken } = await response.json();

    return accessToken;
  }

  return async function invalidatePaths(paths) {
    const token = await getAccessToken();
    const url = `https://compute.googleapis.com/compute/v1/projects/${
      projectId || ''
    }/global/urlMaps/${urlMap}/invalidateCache`;

    await Promise.all(
      paths.map(async path => {
        try {
          const response = await fetchFn(url, {
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
          });

          if (!response.ok && consoleError) {
            consoleError(`invalidate ${path} failed: ${response.status}`);
          }
        } catch (error) {
          if (consoleError) {
            consoleError(`invalidate ${path} error`, error?.message || error);
          }
        }
      })
    );
  };
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
  consoleError = console.error,
  bucketName = DEFAULT_BUCKET_NAME,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  assertStorage(storage);
  assertFunction(fetchFn, 'fetchFn');
  assertFunction(randomUUID, 'randomUUID');

  const bucket = storage.bucket(bucketName);
  const invalidatePaths = createInvalidatePaths({
    fetchFn,
    projectId,
    urlMapName,
    cdnHost,
    randomUUID,
    consoleError,
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

    if (cache) {
      return cache;
    }

    if (!database || typeof database.collection !== 'function') {
      throw new TypeError('db must provide a collection helper');
    }

    const created = factory(database);
    setCache(created);
    return created;
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

      if (info) {
        items.push(info);
      }
    }

    return items;
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
      let filePath;
      if (page === 1) {
        filePath = 'index.html';
      } else {
        filePath = `contents/${page}.html`;
      }
      const options = { contentType: 'text/html' };

      if (page === totalPages) {
        options.metadata = { cacheControl: 'no-cache' };
      }

      await targetBucket.file(filePath).save(html, options);
      paths.push(`/${filePath}`);
    }

    return paths;
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
      pageSize,
      bucket,
    });

    await invalidatePaths(paths);
    return null;
  };
}

/**
 * Resolve the list of allowed origins for the render-contents endpoint.
 * @param {{ [key: string]: string | undefined } | undefined} environmentVariables Environment variables map.
 * @returns {string[]} Whitelist of allowed origins.
 */
export function getAllowedOrigins(environmentVariables) {
  const configuredOrigins =
    environmentVariables?.RENDER_CONTENTS_ALLOWED_ORIGINS;

  if (typeof configuredOrigins === 'string' && configuredOrigins.trim()) {
    return configuredOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
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
    let origin;
    if (typeof req?.get === 'function') {
      origin = req.get('Origin');
    } else {
      origin = undefined;
    }
    let originAllowed = false;

    if (!origin) {
      res.set('Access-Control-Allow-Origin', '*');
      originAllowed = true;
    } else if (origins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      originAllowed = true;
    } else {
      res.set('Access-Control-Allow-Origin', 'null');
      res.set('Vary', 'Origin');
    }

    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization');

    return originAllowed;
  };
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

    const method = req?.method;

    if (method === 'OPTIONS') {
      if (originAllowed) {
        res.status(204).send('');
      } else {
        res.status(403).send('');
      }
      return false;
    }

    if (!originAllowed) {
      res.status(403).send('CORS');
      return false;
    }

    if (method !== 'POST') {
      res.status(405).send('POST only');
      return false;
    }

    return true;
  };
}

/**
 * Extract the Authorization header via the request getter.
 * @param {{ get?: (name: string) => unknown }} req Incoming request-like object.
 * @returns {unknown} Value returned by {@code req.get('Authorization')} or undefined.
 */
function getAuthorizationHeaderFromGetter(req) {
  if (typeof req?.get === 'function') {
    return req.get('Authorization');
  }

  return undefined;
}

/**
 * Resolve the Authorization header from a request-like object.
 * @param {{ get?: (name: string) => unknown, headers?: object }} req Incoming request object.
 * @returns {string} Authorization header or an empty string.
 */
function resolveAuthorizationHeader(req) {
  const getterHeader = getAuthorizationHeaderFromGetter(req);

  if (typeof getterHeader === 'string') {
    return getterHeader;
  }

  // Explicit empty else branch to satisfy branch coverage tooling.

  const headers = req?.headers;

  if (headers && typeof headers === 'object') {
    const header = headers.Authorization ?? headers.authorization;

    if (Array.isArray(header)) {
      return header[0] ?? '';
    }

    if (typeof header === 'string') {
      return header;
    }
  }

  return '';
}

/**
 * Extract the bearer token from an authorization header string.
 * @param {string} header Authorization header.
 * @returns {string} Bearer token or an empty string if none found.
 */
function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return '';
  }

  const match = header.match(/^Bearer (.+)$/);

  if (match) {
    return match[1];
  }
  return '';
}

/**
 * Create the HTTP handler that protects and executes the render contents workflow.
 * @param {object} root0 Handler dependencies.
 * @param {(req: { method?: string }, res: { status: Function, send: Function }) => boolean} root0.validateRequest Pre-flight validator.
 * @param {(token: string) => Promise<{ uid?: string }>} root0.verifyIdToken Firebase token verifier.
 * @param {string} root0.adminUid UID allowed to trigger rendering.
 * @param {() => Promise<void>} root0.render Rendering function.
 * @returns {(req: { method?: string }, res: { status: Function, send: Function, json: Function }) => Promise<void>} Express handler.
 */
export function createHandleRenderRequest({
  validateRequest,
  verifyIdToken,
  adminUid,
  render,
}) {
  assertFunction(validateRequest, 'validateRequest');
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(render, 'render');

  if (!adminUid) {
    throw new TypeError('adminUid must be provided');
  }

  /**
   * Validate the authorization header and ensure the requester is the admin.
   * @param {{ req: { get?: (name: string) => unknown, headers?: object }, res: { status: Function, send: Function } }} options
   * Request/response pair used to communicate failures.
   * @returns {Promise<{ uid?: string } | null>} The decoded token when authorized, otherwise null.
   */
  async function authorizeRequest({ req, res }) {
    const header = resolveAuthorizationHeader(req);
    const token = extractBearerToken(header);

    if (!token) {
      res.status(401).send('Missing token');
      return null;
    }

    try {
      const decoded = await verifyIdToken(token);

      if (!decoded || decoded.uid !== adminUid) {
        res.status(403).send('Forbidden');
        return null;
      }

      return decoded;
    } catch (error) {
      res.status(401).send(error?.message || 'Invalid token');
      return null;
    }
  }

  /**
   *
   * @param req
   * @param res
   */
  async function executeRenderRequest(req, res) {
    const decoded = await authorizeRequest({ req, res });

    if (decoded) {
      await executeRenderRequestAfterGuard(res);
    }
  }

  /**
   *
   * @param res
   */
  async function executeRenderRequestAfterGuard(res) {
    try {
      await render();
      res.status(200).json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error?.message || 'render failed' });
    }
  }

  return async function handleRenderRequest(req, res) {
    if (validateRequest(req, res)) {
      await executeRenderRequest(req, res);
    }
  };
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
  return createHandleRenderRequest({
    validateRequest,
    verifyIdToken,
    adminUid,
    render,
  });
}
