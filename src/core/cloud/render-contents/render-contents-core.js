import { DEFAULT_BUCKET_NAME, productionOrigins } from './cloud-core.js';
import { LIST_ITEM_HTML, PAGE_HTML } from './htmlSnippets.js';

export { DEFAULT_BUCKET_NAME, productionOrigins };
const DEFAULT_PAGE_SIZE = 100;

function assertDb(db) {
  if (!db || typeof db.collection !== 'function') {
    throw new TypeError('db must provide a collection helper');
  }
}

function assertStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildHtml(items) {
  const list = items
    .map(item => LIST_ITEM_HTML(item.pageNumber, escapeHtml(item.title)))
    .join('');

  return PAGE_HTML(list);
}

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
    if (!Array.isArray(paths) || paths.length === 0) {
      return;
    }

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

  return async function render(deps = {}) {
    let loadStoryIds = deps.fetchTopStoryIds;

    if (!loadStoryIds) {
      if (!fetchTopStoryIds) {
        if (!db || typeof db.collection !== 'function') {
          throw new TypeError('db must provide a collection helper');
        }

        fetchTopStoryIds = createFetchTopStoryIds(db);
      }

      loadStoryIds = fetchTopStoryIds;
    }

    let loadStoryInfo = deps.fetchStoryInfo;

    if (!loadStoryInfo) {
      if (!fetchStoryInfo) {
        if (!db || typeof db.collection !== 'function') {
          throw new TypeError('db must provide a collection helper');
        }

        fetchStoryInfo = createFetchStoryInfo(db);
      }

      loadStoryInfo = fetchStoryInfo;
    }

    const ids = await loadStoryIds();
    const items = [];

    for (const id of ids) {
      const info = await loadStoryInfo(id);

      if (info) {
        items.push(info);
      }
    }

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const paths = [];

    for (let page = 1; page <= totalPages; page += 1) {
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
  };
}

export function getAllowedOrigins(environmentVariables) {
  const configuredOrigins = environmentVariables?.RENDER_CONTENTS_ALLOWED_ORIGINS;

  if (typeof configuredOrigins === 'string' && configuredOrigins.trim()) {
    return configuredOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  }

  return [...productionOrigins];
}

export function createApplyCorsHeaders({ allowedOrigins }) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return function applyCorsHeaders(req, res) {
    const origin = typeof req?.get === 'function' ? req.get('Origin') : undefined;
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

export function createValidateRequest({ applyCorsHeaders }) {
  assertFunction(applyCorsHeaders, 'applyCorsHeaders');

  return function validateRequest(req, res) {
    const originAllowed = applyCorsHeaders(req, res);

    const method = req?.method;

    if (method === 'OPTIONS') {
      res.status(originAllowed ? 204 : 403).send('');
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

function resolveAuthorizationHeader(req) {
  if (req && typeof req.get === 'function') {
    const header = req.get('Authorization');

    if (typeof header === 'string') {
      return header;
    }
  }

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

function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return '';
  }

  const match = header.match(/^Bearer (.+)$/);

  return match ? match[1] : '';
}

export function createAuthorizationExtractor() {
  return function getAuthorizationToken(req) {
    const header = resolveAuthorizationHeader(req);

    return extractBearerToken(header);
  };
}

export function createHandleRenderRequest({
  validateRequest,
  getAuthorizationToken,
  verifyIdToken,
  adminUid,
  render,
}) {
  assertFunction(validateRequest, 'validateRequest');
  assertFunction(getAuthorizationToken, 'getAuthorizationToken');
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(render, 'render');

  if (!adminUid) {
    throw new TypeError('adminUid must be provided');
  }

  return async function handleRenderRequest(req, res, overrides = {}) {
    if (!validateRequest(req, res)) {
      return;
    }

    const token = getAuthorizationToken(req);

    if (!token) {
      res.status(401).send('Missing token');
      return;
    }

    let decoded;

    try {
      decoded = await verifyIdToken(token);
    } catch (error) {
      res.status(401).send(error?.message || 'Invalid token');
      return;
    }

    if (!decoded || decoded.uid !== adminUid) {
      res.status(403).send('Forbidden');
      return;
    }

    const renderFn = overrides.renderFn ?? render;

    if (typeof renderFn !== 'function') {
      throw new TypeError('renderFn must be a function');
    }

    try {
      await renderFn();
      res.status(200).json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error?.message || 'render failed' });
    }
  };
}
