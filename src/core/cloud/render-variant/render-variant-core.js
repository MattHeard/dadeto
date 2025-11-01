import { assertFunction, DEFAULT_BUCKET_NAME } from './cloud-core.js';
import { buildAltsHtml, escapeHtml } from './buildAltsHtml.js';
import { buildHtml } from './buildHtml.js';
import { getVisibleVariants, VISIBILITY_THRESHOLD } from './visibility.js';

export { DEFAULT_BUCKET_NAME } from './cloud-core.js';

/**
 * Ensure a Firestore-like database instance exposes the required helpers.
 * @param {{doc: Function}} db - Database instance that should provide a `doc` helper.
 * @throws {TypeError} When the provided database does not expose a `doc` function.
 */
function assertDb(db) {
  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must provide a doc helper');
  }
}

/**
 * Confirm the storage dependency can create bucket handles.
 * @param {{bucket: Function}} storage - Storage implementation expected to expose a `bucket` helper.
 * @throws {TypeError} When the provided storage does not expose a `bucket` function.
 */
function assertStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage must provide a bucket helper');
  }
}

/**
 * Build a helper that invalidates CDN paths via the Google Compute API.
 * @param {object} options - Configuration for cache invalidation.
 * @param {(url: string, init?: object) => Promise<{ok: boolean, status: number, json: () => Promise<object>}>} options.fetchFn - Fetch implementation used to communicate with the metadata and compute APIs.
 * @param {string} [options.projectId] - Google Cloud project identifier owning the URL map.
 * @param {string} [options.urlMapName] - Name of the URL map whose cache should be invalidated.
 * @param {string} [options.cdnHost] - Hostname associated with the CDN-backed site.
 * @param {() => string} options.randomUUID - UUID generator for cache invalidation requests.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger invoked when invalidation fails.
 * @returns {(paths: string[]) => Promise<void>} Invalidation routine that accepts absolute paths to purge.
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
   * Retrieve an access token from the metadata server for authenticated requests.
   * @returns {Promise<string>} Resolves with a short-lived OAuth access token.
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

/**
 * Construct metadata for a single option attached to a story variant.
 * @param {object} options - Information about the option to prepare for rendering.
 * @param {Record<string, any>} options.data - Raw option document data.
 * @param {number} options.visibilityThreshold - Minimum visibility required for a variant to be considered published.
 * @param {{doc: Function}} options.db - Firestore-like database used for lookups.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<object>} Metadata describing the option suitable for HTML rendering.
 */
async function buildOptionMetadata({
  data,
  visibilityThreshold,
  db,
  consoleError,
}) {
  let targetPageNumber;
  let targetVariantName;
  let targetVariants;

  if (data.targetPage) {
    try {
      const targetSnap = await data.targetPage.get();

      if (targetSnap.exists) {
        targetPageNumber = targetSnap.data().number;
        const variantSnap = await data.targetPage
          .collection('variants')
          .orderBy('name')
          .get();
        const visible = variantSnap.docs.filter(
          doc => (doc.data().visibility ?? 1) >= visibilityThreshold
        );

        if (visible.length) {
          targetVariantName = visible[0].data().name;
          targetVariants = visible.map(doc => ({
            name: doc.data().name,
            weight: doc.data().visibility ?? 1,
          }));
        }
      }
    } catch (error) {
      if (consoleError) {
        consoleError('target page lookup failed', error?.message || error);
      }
    }
  } else if (data.targetPageNumber !== undefined) {
    targetPageNumber = data.targetPageNumber;
  }

  return {
    content: data.content || '',
    position: data.position ?? 0,
    ...(targetPageNumber !== undefined && { targetPageNumber }),
    ...(targetVariantName && { targetVariantName }),
    ...(targetVariants && { targetVariants }),
  };
}

/**
 * Load and normalize option documents for a particular variant.
 * @param {object} options - Dependencies required to load options.
 * @param {{ref: {collection: Function}}} options.snap - Firestore snapshot for the variant whose options are being read.
 * @param {number} options.visibilityThreshold - Minimum visibility required for inclusion.
 * @param {{doc: Function}} options.db - Firestore-like database for nested lookups.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<object[]>} Ordered option metadata entries.
 */
async function loadOptions({ snap, visibilityThreshold, db, consoleError }) {
  const optionsSnap = await snap.ref.collection('options').get();
  const optionsData = optionsSnap.docs
    .map(doc => doc.data())
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return Promise.all(
    optionsData.map(data =>
      buildOptionMetadata({
        data,
        visibilityThreshold,
        db,
        consoleError,
      })
    )
  );
}

/**
 * Resolve title and navigation metadata for the story owning the variant.
 * @param {object} options - Input describing the current page and lookup helpers.
 * @param {{ref: {parent?: {parent?: any}}, get: Function, exists: boolean}} options.pageSnap - Firestore snapshot for the current page.
 * @param {Record<string, any>} options.page - Raw page document data.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<{storyTitle: string, firstPageUrl: string | undefined}>} Story metadata used in templates.
 */
async function resolveStoryMetadata({ pageSnap, page, consoleError }) {
  const storyRef = pageSnap.ref.parent?.parent;

  if (!storyRef) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storySnap = await storyRef.get();

  if (!storySnap.exists) {
    return { storyTitle: '', firstPageUrl: undefined };
  }

  const storyData = storySnap.data() || {};
  const storyTitle = storyData.title || '';
  let firstPageUrl;

  if (page.incomingOption && storyData.rootPage) {
    try {
      const rootPageSnap = await storyData.rootPage.get();

      if (rootPageSnap.exists) {
        const rootVariantSnap = await storyData.rootPage
          .collection('variants')
          .orderBy('name')
          .limit(1)
          .get();

        if (!rootVariantSnap.empty) {
          firstPageUrl = `/p/${rootPageSnap.data().number}${
            rootVariantSnap.docs[0].data().name
          }.html`;
        }
      }
    } catch (error) {
      if (consoleError) {
        consoleError('root page lookup failed', error?.message || error);
      }
    }
  }

  return { storyTitle, firstPageUrl };
}

/**
 * Resolve author metadata for the rendered variant, creating landing pages if needed.
 * @param {object} options - Inputs for author lookup.
 * @param {Record<string, any>} options.variant - Variant data being rendered.
 * @param {{doc: Function}} options.db - Firestore-like database used to load author documents.
 * @param {{file: (path: string) => { save: Function, exists: () => Promise<[boolean]> }}} options.bucket - Bucket handle used to read/write author HTML.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Logger for recoverable failures.
 * @returns {Promise<{authorName: string, authorUrl: string | undefined}>} Author metadata for templates.
 */
async function resolveAuthorMetadata({ variant, db, bucket, consoleError }) {
  const authorName = variant.authorName || variant.author || '';

  if (!variant.authorId || !authorName) {
    return { authorName, authorUrl: undefined };
  }

  try {
    const authorRef = db.doc(`authors/${variant.authorId}`);
    const authorSnap = await authorRef.get();

    if (!authorSnap.exists) {
      return { authorName, authorUrl: undefined };
    }

    const { uuid } = authorSnap.data() || {};

    if (!uuid) {
      return { authorName, authorUrl: undefined };
    }

    const authorPath = `a/${uuid}.html`;
    const file = bucket.file(authorPath);
    const [exists] = await file.exists();

    if (!exists) {
      const authorHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite - ${escapeHtml(
        authorName
      )}</title><link rel="icon" href="/favicon.ico" /><link rel="stylesheet" href="/dendrite.css" /></head><body><main><h1>${escapeHtml(
        authorName
      )}</h1></main></body></html>`;
      await file.save(authorHtml, { contentType: 'text/html' });
    }

    return { authorName, authorUrl: `/${authorPath}` };
  } catch (error) {
    if (consoleError) {
      consoleError('author lookup failed', error?.message || error);
    }

    return { authorName, authorUrl: undefined };
  }
}

/**
 * Resolve parent document references for the variant hierarchy.
 * @param {{ parent?: { parent?: any } } | null | undefined} optionRef Reference to the incoming option document.
 * @returns {{ parentVariantRef: { get: Function, parent?: { parent?: any } }, parentPageRef: { get: Function } } | null} Parent
 * references when the hierarchy can be resolved, otherwise null.
 */
function resolveParentReferences(optionRef) {
  if (!optionRef) {
    return null;
  }

  const parentVariantRef = optionRef.parent?.parent;
  const parentPageRef = parentVariantRef?.parent?.parent;

  if (!parentVariantRef || !parentPageRef) {
    return null;
  }

  return { parentVariantRef, parentPageRef };
}

/**
 * Fetch the parent variant and page documents.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentVariantRef Firestore-like document reference.
 * @param {{ get: () => Promise<{ exists: boolean }> }} parentPageRef Firestore-like document reference.
 * @returns {Promise<{ parentVariantSnap: { exists: boolean, data: () => Record<string, any> }, parentPageSnap: { exists: boolean, data: () => Record<string, any> } } | null>} Snapshot tuple when both documents exist, otherwise null.
 */
async function fetchParentSnapshots(parentVariantRef, parentPageRef) {
  const [parentVariantSnap, parentPageSnap] = await Promise.all([
    parentVariantRef.get(),
    parentPageRef.get(),
  ]);

  if (!parentVariantSnap.exists || !parentPageSnap.exists) {
    return null;
  }

  return { parentVariantSnap, parentPageSnap };
}

/**
 * Create the parent route slug from snapshot data.
 * @param {{ data: () => Record<string, any> }} parentVariantSnap Variant snapshot.
 * @param {{ data: () => Record<string, any> }} parentPageSnap Page snapshot.
 * @returns {string | null} Route path when identifiers can be derived, otherwise null.
 */
function buildParentRoute(parentVariantSnap, parentPageSnap) {
  const parentData = parentVariantSnap.data() || {};
  const pageData = parentPageSnap.data() || {};
  const parentName = parentData.name;
  const parentNumber = pageData.number;

  if (!parentName || parentNumber === undefined) {
    return null;
  }

  return `/p/${parentNumber}${parentName}.html`;
}

/**
 * Determine the canonical URL of the variant's parent, if any.
 * @param {{
 *   variant: Record<string, any>,
 *   db: { doc: (path: string) => { parent?: { parent?: any }, get: Function } },
 *   consoleError?: (message?: unknown, ...optionalParams: unknown[]) => void
 * }} options Inputs for parent resolution.
 * @returns {Promise<string | undefined>} URL to the parent variant when it can be resolved.
 */
async function resolveParentUrl({ variant, db, consoleError }) {
  if (!variant.incomingOption) {
    return undefined;
  }

  try {
    const optionRef = db.doc(variant.incomingOption);
    const references = resolveParentReferences(optionRef);

    if (!references) {
      return undefined;
    }

    const snapshots = await fetchParentSnapshots(
      references.parentVariantRef,
      references.parentPageRef
    );

    if (!snapshots) {
      return undefined;
    }

    const route = buildParentRoute(
      snapshots.parentVariantSnap,
      snapshots.parentPageSnap
    );

    if (route === null) {
      return undefined;
    }

    return route;
  } catch (error) {
    if (consoleError) {
      consoleError('parent lookup failed', error?.message || error);
    }

    return undefined;
  }
}

/**
 * Create a renderer that materializes variant HTML and supporting metadata.
 * @param {object} dependencies - External services and configuration values.
 * @param {{doc: Function}} dependencies.db - Firestore-like database used to load related documents.
 * @param {{bucket: (name: string) => { file: (path: string) => { save: Function } }}} dependencies.storage - Cloud storage helper capable of writing files.
 * @param {(url: string, init?: object) => Promise<{ok: boolean, status: number, json: () => Promise<object>}>} dependencies.fetchFn - Fetch implementation used for cache invalidation calls.
 * @param {() => string} dependencies.randomUUID - UUID generator for request identifiers.
 * @param {string} [dependencies.projectId] - Google Cloud project identifier used for cache invalidation.
 * @param {string} [dependencies.urlMapName] - URL map name whose cache should be invalidated.
 * @param {string} [dependencies.cdnHost] - Hostname whose cache entries should be purged.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [dependencies.consoleError] - Logger for recoverable failures.
 * @param {string} [dependencies.bucketName] - Name of the bucket where rendered HTML is written.
 * @param {number} [dependencies.visibilityThreshold] - Minimum visibility used when publishing variants.
 * @returns {(snap: {exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}, context?: {params?: Record<string, string>}) => Promise<null>} Async renderer for variant snapshots.
 */
export function createRenderVariant({
  db,
  storage,
  fetchFn,
  randomUUID,
  projectId,
  urlMapName,
  cdnHost,
  consoleError = console.error,
  bucketName = DEFAULT_BUCKET_NAME,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertDb(db);
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

  return async function render(snap, context = {}) {
    const renderPlan = await resolveRenderPlan({
      snap,
      db,
      bucket,
      consoleError,
      visibilityThreshold,
    });

    if (!renderPlan) {
      return null;
    }

    await persistRenderPlan({
      snap,
      context,
      bucket,
      invalidatePaths,
      ...renderPlan,
    });
    return null;
  };
}

/**
 * Prepare the information required to render and publish a variant.
 * @param {object} options - Dependencies and inputs for rendering.
 * @param {{exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}} options.snap - Variant snapshot.
 * @param {{doc: Function}} options.db - Firestore-like database instance.
 * @param {{bucket: Function}} options.bucket - Storage bucket factory.
 * @param {(message?: unknown, ...optionalParams: unknown[]) => void} [options.consoleError] - Optional logger.
 * @param {number} options.visibilityThreshold - Minimum visibility required for variant publication.
 * @returns {Promise<null | {
 *   variant: Record<string, any>,
 *   page: Record<string, any>,
 *   parentUrl: string | undefined,
 *   html: string,
 *   filePath: string,
 *   openVariant: boolean
 * }>} Render plan describing the variant artefacts.
 */
async function resolveRenderPlan({
  snap,
  db,
  bucket,
  consoleError,
  visibilityThreshold,
}) {
  if (snap && 'exists' in snap && !snap.exists) {
    return null;
  }

  const variant = snap.data() || {};
  const pageSnap = await snap.ref.parent?.parent?.get();

  if (!pageSnap?.exists) {
    return null;
  }

  const page = pageSnap.data() || {};
  const options = await loadOptions({
    snap,
    visibilityThreshold,
    db,
    consoleError,
  });
  const { storyTitle, firstPageUrl } = await resolveStoryMetadata({
    pageSnap,
    page,
    consoleError,
  });
  const { authorName, authorUrl } = await resolveAuthorMetadata({
    variant,
    db,
    bucket,
    consoleError,
  });
  const parentUrl = await resolveParentUrl({ variant, db, consoleError });

  const html = buildHtml(
    page.number,
    variant.name,
    variant.content,
    options,
    storyTitle,
    authorName,
    authorUrl,
    parentUrl,
    firstPageUrl,
    !page.incomingOption
  );
  const filePath = `p/${page.number}${variant.name}.html`;
  const openVariant = options.some(
    option => option.targetPageNumber === undefined
  );

  return { variant, page, parentUrl, html, filePath, openVariant };
}

/**
 * Persist rendered variant artefacts and trigger CDN invalidation.
 * @param {object} options - Artefacts and dependencies used for persistence.
 * @param {{exists?: boolean, data: () => Record<string, any>, ref: {parent?: {parent?: any}}}} options.snap - Variant snapshot.
 * @param {object} [options.context] - Invocation context containing request parameters.
 * @param {{bucket: (name: string) => { file: (path: string) => { save: Function } }}} options.bucket - Storage helper.
 * @param {(paths: string[]) => Promise<void>} options.invalidatePaths - Cache invalidation routine.
 * @param {Record<string, any>} options.variant - Variant document data.
 * @param {Record<string, any>} options.page - Parent page document data.
 * @param {string | undefined} options.parentUrl - URL of the parent variant, when available.
 * @param {string} options.html - Rendered HTML payload for the variant.
 * @param {string} options.filePath - Storage path for the rendered HTML.
 * @param {boolean} options.openVariant - Indicates whether the variant is open (no target page).
 * @returns {Promise<void>} Resolves when artefacts are persisted and caches invalidated.
 */
async function persistRenderPlan({
  snap,
  context,
  bucket,
  invalidatePaths,
  variant,
  page,
  parentUrl,
  html,
  filePath,
  openVariant,
}) {
  await bucket.file(filePath).save(html, {
    contentType: 'text/html',
    ...(openVariant && { metadata: { cacheControl: 'no-store' } }),
  });

  const variantsSnap = await snap.ref.parent.get();
  const variants = getVisibleVariants(variantsSnap.docs);
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;

  await bucket.file(altsPath).save(altsHtml, { contentType: 'text/html' });

  const pendingName = variant.incomingOption
    ? context?.params?.variantId
    : context?.params?.storyId;
  const pendingPath = `pending/${pendingName}.json`;

  await bucket.file(pendingPath).save(JSON.stringify({ path: filePath }), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store' },
  });

  const paths = [`/${altsPath}`, `/${filePath}`];

  if (parentUrl) {
    paths.push(parentUrl);
  }

  await invalidatePaths(paths);
}

/**
 * Build a change handler that renders visible variants and clears dirty markers.
 * @param {object} options - Dependencies for the change handler.
 * @param {(snap: any, context?: object) => Promise<null>} options.renderVariant - Renderer invoked when a variant should be materialized.
 * @param {() => unknown} options.getDeleteSentinel - Function that produces the sentinel used to clear dirty flags.
 * @param {number} [options.visibilityThreshold] - Minimum visibility required before rendering.
 * @returns {(change: {before: {exists: boolean, data: () => Record<string, any>}, after: {exists: boolean, data: () => Record<string, any>, ref: {update: Function}}}, context?: {params?: Record<string, string>}) => Promise<null>} Firestore change handler.
 */
export function createHandleVariantWrite({
  renderVariant,
  getDeleteSentinel,
  visibilityThreshold = VISIBILITY_THRESHOLD,
}) {
  assertFunction(renderVariant, 'renderVariant');
  assertFunction(getDeleteSentinel, 'getDeleteSentinel');

  return async function handleVariantWrite(change, context = {}) {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data() || {};

    if (Object.prototype.hasOwnProperty.call(data, 'dirty')) {
      await renderVariant(change.after, context);
      await change.after.ref.update({ dirty: getDeleteSentinel() });
      return null;
    }

    if (!change.before.exists) {
      return renderVariant(change.after, context);
    }

    const beforeVisibility = change.before.data().visibility ?? 0;
    const afterVisibility = data.visibility ?? 0;

    if (
      beforeVisibility < visibilityThreshold &&
      afterVisibility >= visibilityThreshold
    ) {
      return renderVariant(change.after, context);
    }

    return null;
  };
}

export { buildAltsHtml, buildHtml, getVisibleVariants, VISIBILITY_THRESHOLD };
