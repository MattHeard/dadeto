import { DEFAULT_BUCKET_NAME, getSnapshotData } from './cloud-core.js';
import {
  assertFunction,
  ensureString,
  isNullish,
  normalizeNonStringValue,
} from '../common-core.js';

const DEFAULT_VISIBILITY_THRESHOLD = 0.5;

/**
 * Normalize the result returned by the loader so downstream logic can rely on
 * consistent structure.
 * @param {*} loadResult Value returned by loadPageForVariant.
 * @returns {{ page: * | null, variant: * | null }} Normalized payload data.
 */
export function normalizeRemoveVariantLoadResult(loadResult) {
  if (!loadResult) {
    return { page: null, variant: null };
  }

  return normalizeLoadResultValue(loadResult);
}

/**
 * Normalize the primitive load result when it is not an object.
 * @param {*} loadResult Value returned from the page loader.
 * @returns {{ page: *, variant: * | undefined }} Normalized placeholder.
 */
function normalizeLoadResultValue(loadResult) {
  if (typeof loadResult !== 'object') {
    return { page: loadResult, variant: null };
  }

  return normalizeObjectLoadResult(loadResult);
}

/**
 * Normalize the loader payload when the result is already an object.
 * @param {{ page?: *, variant?: * }} loadResult Loader response.
 * @returns {{ page: *, variant: * | null }} Normalized reminder.
 */
function normalizeObjectLoadResult(loadResult) {
  if (!hasPageOrVariant(loadResult)) {
    return { page: loadResult, variant: undefined };
  }

  return {
    page: normalizeNullableField(loadResult.page),
    variant: normalizeNullableField(loadResult.variant),
  };
}

/**
 * Determine whether the loader object exposes page or variant helpers.
 * @param {{ page?: *, variant?: * }} value Loader value.
 * @returns {boolean} Whether page or variant keys exist.
 */
function hasPageOrVariant(value) {
  if ('page' in value) {
    return true;
  }
  return 'variant' in value;
}

/**
 * Normalize nullable fields to `null`.
 * @param {*} value Field value.
 * @returns {*} Null when the value is undefined; otherwise returns the value.
 */
function normalizeNullableField(value) {
  if (isNullish(value)) {
    return null;
  }
  return value;
}

/**
 * Determine which variant data should be used when deleting the rendered HTML.
 * @param {object} options Resolution inputs.
 * @param {boolean} options.hasProvidedData Whether the payload supplied variant data.
 * @param {*} options.providedData Variant data passed directly to the helper.
 * @param {*} options.loadedVariant Variant data returned by the loader.
 * @returns {*} The variant data to use when building the path.
 */
function resolveVariantData({ hasProvidedData, providedData, loadedVariant }) {
  if (hasProvidedData) {
    return providedData;
  }

  return resolveLoadedVariant(loadedVariant);
}

/**
 * Resolve the data for a loaded variant when available.
 * @param {*} loadedVariant Variant data returned by the loader.
 * @returns {*} The raw variant data when present; otherwise undefined.
 */
function resolveLoadedVariant(loadedVariant) {
  if (loadedVariant === undefined) {
    return undefined;
  }

  return loadedVariant;
}

/**
 * Normalize variant identifiers so undefined becomes null for downstream helpers.
 * @param {string | null | undefined} variantId Candidate variant identifier.
 * @returns {string | null} Normalized identifier or null when undefined.
 */
function resolveVariantId(variantId) {
  if (variantId === undefined) {
    return null;
  }

  return variantId;
}

/**
 * @typedef {object} RemoveVariantHtmlPayload
 * @property {string | null | undefined} [variantId] Optional variant identifier.
 * @property {*} [variantData] Raw variant details required to locate the page.
 * @property {*} [pageRef] Hint that allows dependencies to locate the page snapshot.
 */

/**
 * @typedef {object} RemoveVariantHtmlResult
 * @property {*} page Page information returned by the loader.
 * @property {*} [variant] Optional variant details from the loader.
 */

/**
 * @typedef {RemoveVariantHtmlResult | * | null} RemoveVariantLoadResult
 */

/**
 * @typedef {object} SnapshotLike
 * @property {*} data - Data method or value
 * @property {boolean} exists - Whether the document exists
 */

export const VISIBILITY_THRESHOLD = DEFAULT_VISIBILITY_THRESHOLD;

/**
 * Create a helper that deletes rendered HTML for a variant.
 * @param {object} dependencies Collaborators required to remove the HTML artifact.
 * @param {(payload: RemoveVariantHtmlPayload) => Promise<RemoveVariantLoadResult>} dependencies.loadPageForVariant Function that retrieves the page and variant data.
 * @param {(payload: { variantId: string | null, variantData: *, page: * }) => Promise<string> | string} dependencies.buildVariantPath Function that maps a variant to the rendered file path.
 * @param {(path: string) => Promise<*>} dependencies.deleteRenderedFile Function that deletes the rendered file from storage.
 * @returns {(payload?: RemoveVariantHtmlPayload) => Promise<null>} Helper that removes the rendered HTML file when possible.
 */
export function createRemoveVariantHtml({
  loadPageForVariant,
  buildVariantPath,
  deleteRenderedFile,
}) {
  assertFunction(loadPageForVariant, 'loadPageForVariant');
  assertFunction(buildVariantPath, 'buildVariantPath');
  assertFunction(deleteRenderedFile, 'deleteRenderedFile');

  return async function removeVariantHtml(payload = {}) {
    const { variantId, variantData, pageRef } = payload;
    const hasVariantData = Object.prototype.hasOwnProperty.call(
      payload,
      'variantData'
    );

    const loadResult = await loadPageForVariant({
      variantId,
      variantData,
      pageRef,
    });
    const { page, variant } = normalizeRemoveVariantLoadResult(loadResult);

    return removeVariantPayload({
      page,
      variantId,
      hasVariantData,
      variantData,
      variant,
      buildVariantPath,
      deleteRenderedFile,
    });
  };
}

/**
 * Remove rendered HTML when a page context is available.
 * @param {{
 *   page: *,
 *   variantId: string | null | undefined,
 *   hasVariantData: boolean,
 *   variantData: *,
 *   variant: *,
 *   buildVariantPath: (payload: { variantId: string | null, variantData: *, page: * }) => Promise<string> | string,
 *   deleteRenderedFile: (path: string) => Promise<*>,
 * }} params Context required to delete the rendered file.
 * @returns {Promise<null>} Resolves once deletion completes or when no page exists.
 */
async function removeVariantPayload({
  page,
  variantId,
  hasVariantData,
  variantData,
  variant,
  buildVariantPath,
  deleteRenderedFile,
}) {
  if (!page) {
    return null;
  }

  const resolvedVariantData = resolveVariantData({
    hasProvidedData: hasVariantData,
    providedData: variantData,
    loadedVariant: variant,
  });

  const path = await buildVariantPath({
    variantId: resolveVariantId(variantId),
    variantData: resolvedVariantData,
    page,
  });

  await deleteRenderedFile(path);

  return null;
}

/**
 * Create a helper that deletes rendered HTML paths from Cloud Storage.
 * @param {object} options Storage configuration.
 * @param {{
 *   bucket: (name: string) => { file: (path: string) => { delete: (config: { ignoreNotFound: boolean }) => Promise<*> } },
 * }} options.storage Cloud Storage instance.
 * @param {string} [options.bucketName] Bucket that stores rendered HTML.
 * @returns {(path: string) => Promise<void>} Helper that deletes the rendered file.
 */
export function createBucketFileRemover({
  storage,
  bucketName = DEFAULT_BUCKET_NAME,
}) {
  const validatedBucketName = validateBucketName(bucketName);
  validateStorage(storage);

  return function deleteRenderedFile(path) {
    return deleteIfPathValid(path, () => {
      const validatedStorage =
        /** @type {{ bucket: (name: string) => { file: (path: string) => { delete: (config: { ignoreNotFound: boolean }) => Promise<*> } } }} */ (
          storage
        );
      return validatedStorage
        .bucket(validatedBucketName)
        .file(path)
        .delete({ ignoreNotFound: true })
        .then(() => undefined);
    });
  };
}

/**
 * Validate bucket name.
 * @param {unknown} bucketName Bucket name.
 * @returns {string} Bucket.
 */
function validateBucketName(bucketName) {
  ensureBucketName(bucketName);
  return /** @type {string} */ (bucketName);
}

/**
 * Validate storage exposes bucket helper.
 * @param {unknown} storage Storage.
 * @returns {void}
 */
function validateStorage(storage) {
  ensureStorageBucketComponent(storage);
}

/**
 * Check path validity.
 * @param {unknown} path Path.
 * @returns {boolean} True if valid.
 */
function isValidPath(path) {
  return typeof path === 'string' && path.length > 0;
}

/**
 * Delete the rendered file only when the path is valid.
 * @param {unknown} path Candidate path string.
 * @param {() => Promise<*>} deleteFn Deletion action executed when the path passes validation.
 * @returns {Promise<*>} Promise resolved either immediately or after deletion.
 */
function deleteIfPathValid(path, deleteFn) {
  if (!isValidPath(path)) {
    return Promise.resolve();
  }

  return deleteFn();
}

/**
 * Ensure the provided bucket name is a non-empty string.
 * @param {unknown} bucketName Candidate bucket name.
 * @returns {void}
 */
function ensureBucketName(bucketName) {
  if (!isValidBucketName(bucketName)) {
    throw new TypeError('bucketName must be a non-empty string');
  }
}

/**
 * Confirm the bucket name is a trimmed string.
 * @param {unknown} value Candidate bucket name.
 * @returns {boolean} True when the value is a filled string.
 */
function isValidBucketName(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Ensure the storage dependency exposes the expected bucket helper.
 * @param {unknown} storage Storage client to validate.
 * @returns {void}
 */
function ensureStorageBucketComponent(storage) {
  if (!hasBucketFunction(storage)) {
    throw new TypeError('storage.bucket must be a function');
  }
}

/**
 * Determine whether the storage helper exposes a bucket method.
 * @param {unknown} storage Storage dependency.
 * @returns {storage is { bucket: Function }} True when storage.bucket is callable.
 */
function hasBucketFunction(storage) {
  return Boolean(
    storage && typeof (/** @type {*} */ (storage).bucket) === 'function'
  );
}

/**
 * Convert a numeric page identifier to a string segment.
 * @param {unknown} value Candidate page number.
 * @returns {string} Page number string when valid, otherwise empty string.
 */
function formatPageNumber(value) {
  if (typeof value !== 'number') {
    return '';
  }

  return normalizeNonStringValue(value);
}

/**
 * Normalize a variant name when available.
 * @param {unknown} value Candidate variant name.
 * @returns {string} Variant name string or empty string when invalid.
 */
function formatVariantName(value) {
  return ensureString(value);
}

/**
 * Build the rendered HTML path for a variant page.
 * @param {{ page: *, variantData?: * }} payload Page and variant details.
 * @returns {string} Relative path to the rendered HTML file.
 */
export function buildVariantPath({ page, variantData }) {
  const pageNumber = extractPageNumber(page);
  const variantName = extractVariantName(variantData);
  return `p/${pageNumber}${variantName}.html`;
}

/**
 * Extract page number string.
 * @param {{ number?: unknown }} page Page.
 * @returns {string} Page number segment.
 */
function extractPageNumber(page) {
  return formatPageNumber(page?.number);
}

/**
 * Extract variant name.
 * @param {{ name?: unknown }} variantData Variant data.
 * @returns {string} Variant name segment.
 */
function extractVariantName(variantData) {
  return formatVariantName(variantData?.name);
}

/**
 * Create a helper that adapts Firestore snapshots into the removeVariantHtml payload.
 * @param {(payload?: RemoveVariantHtmlPayload) => Promise<null>} removeVariantHtml Remove helper produced by createRemoveVariantHtml.
 * @returns {(snapshot: { id: string, data?: () => *, ref?: { parent?: { parent?: * } } }) => Promise<null>} Snapshot adapter.
 */
export function createRemoveVariantHtmlForSnapshot(removeVariantHtml) {
  assertFunction(removeVariantHtml, 'removeVariantHtml');

  return function removeVariantHtmlForSnapshot(snapshot) {
    if (!snapshot) {
      return removeVariantHtml();
    }

    return removeVariantHtml(buildRemovePayload(snapshot));
  };
}

/**
 * Build removal payload.
 * @param {{ id?: string, data?: () => *, ref?: { parent?: { parent?: * } } }} snapshot Snapshot.
 * @returns {{ variantId: string | null, variantData: *, pageRef: * }} Payload.
 */
function buildRemovePayload(snapshot) {
  return {
    variantId: snapshot.id ?? null,
    variantData: extractSnapshotData(snapshot),
    pageRef: resolvePageRef(snapshot),
  };
}

/**
 * Extract snapshot data when available.
 * @param {{ data?: () => * }} snapshot Snapshot.
 * @returns {*} Data or undefined.
 */
function extractSnapshotData(snapshot) {
  const data = getSnapshotData(snapshot);
  if (data === null) {
    return undefined;
  }

  return data;
}

/**
 * Resolve page reference from snapshot.
 * @param {{ ref?: { parent?: { parent?: * } } }} snapshot Snapshot.
 * @returns {*} Page ref or null.
 */
function resolvePageRef(snapshot) {
  const ref = snapshot?.ref;
  return resolveParentPageRef(ref);
}

/**
 * Resolve the parent page reference from a Firestore reference chain.
 * @param {{ parent?: { parent?: * } } | null | undefined} ref Reference object.
 * @returns {*} The grandparent reference when available or `null`.
 */
function resolveParentPageRef(ref) {
  if (!hasParentWithGrandparent(ref)) {
    return null;
  }

  return ref?.parent?.parent ?? null;
}

/**
 * Detect whether a reference has a grandparent document.
 * @param {{ parent?: { parent?: unknown } } | null | undefined} ref Reference chain.
 * @returns {boolean} True when two parent hops exist.
 */
function hasParentWithGrandparent(ref) {
  return hasGrandparent(ref?.parent);
}

/**
 * Detect whether the provided reference exposes a parent document.
 * @param {{ parent?: unknown } | null | undefined} ref Reference candidate.
 * @returns {boolean} True when the reference has a parent property.
 */
function hasGrandparent(ref) {
  return Boolean(ref && ref.parent);
}

/**
 * Extract the visibility score from a Firestore snapshot.
 * @param {{ data?: () => * } | null | undefined} snapshot Firestore snapshot.
 * @returns {number} Visibility value or zero when unavailable.
 */
export function getVariantVisibility(snapshot) {
  const data = getSnapshotData(snapshot);
  return extractVisibility(data);
}

/**
 * Extract the numeric visibility value from the snapshot data.
 * @param {unknown} data Visibility payload.
 * @returns {number} The visibility score or zero when unavailable.
 */
function extractVisibility(data) {
  if (hasVisibilityValue(data)) {
    return data.visibility;
  }

  return 0;
}

/**
 * Check whether the data contains a numeric visibility value.
 * @param {unknown} data Snapshot payload.
 * @returns {data is { visibility: number }} True when a numeric visibility is available.
 */
function hasVisibilityValue(data) {
  return Boolean(
    data && typeof (/** @type {*} */ (data).visibility) === 'number'
  );
}

/**
 * Create a handler that determines whether a variant's rendered HTML should be removed.
 * @param {object} options Configuration for the handler.
 * @param {(snapshot: *) => Promise<null>} options.removeVariantHtmlForSnapshot Helper that removes rendered HTML for a snapshot.
 * @param {(snapshot: *) => number} [options.getVisibility] Function that extracts visibility from a snapshot.
 * @param {number} [options.visibilityThreshold] Threshold at which the HTML remains visible.
 * @returns {(change: { before: *, after: { exists: boolean } }) => Promise<null>} Firestore change handler.
 */
export function createHandleVariantVisibilityChange(options) {
  const dependencies = buildVariantVisibilityDependencies(options);

  return createVisibilityChangeHandler(
    dependencies.removeVariantHtmlForSnapshot,
    dependencies.visibilityTransition
  );
}

/**
 * Validate dependencies required by the visibility change handler.
 * @param {object} options Handler configuration.
 * @param {(snapshot: *) => Promise<null>} options.removeVariantHtmlForSnapshot Renderer remover.
 * @param {(snapshot: *) => number} [options.getVisibility] Optional visibility extractor.
 * @param {number} [options.visibilityThreshold] Visibility cutoff.
 * @returns {{
 *   removeVariantHtmlForSnapshot: (snapshot: *) => Promise<null>,
 *   visibilityTransition: (change: { before: *, after: * }) => Promise<null>,
 * }} Validated dependencies.
 */
function buildVariantVisibilityDependencies(options) {
  const { removeVariantHtmlForSnapshot, getVisibility, visibilityThreshold } =
    resolveVariantVisibilityOptions(options);

  assertVariantVisibilityDependencies(
    removeVariantHtmlForSnapshot,
    getVisibility
  );

  return {
    removeVariantHtmlForSnapshot,
    visibilityTransition: createVisibilityTransitionHandler({
      removeVariantHtmlForSnapshot,
      getVisibility,
      visibilityThreshold,
    }),
  };
}

/**
 * Resolve visibility dependency defaults.
 * @param {object} options Handler config.
 * @param {(snapshot: *) => Promise<null>} options.removeVariantHtmlForSnapshot Renderer remover.
 * @param {(snapshot: *) => number} [options.getVisibility] Optional visibility extractor.
 * @param {number} [options.visibilityThreshold] Visibility cutoff.
 * @returns {{
 *   removeVariantHtmlForSnapshot: (snapshot: *) => Promise<null>,
 *   getVisibility: (snapshot: *) => number,
 *   visibilityThreshold: number,
 * }} Normalized dependency set.
 */
function resolveVariantVisibilityOptions({
  removeVariantHtmlForSnapshot,
  getVisibility,
  visibilityThreshold,
}) {
  return {
    removeVariantHtmlForSnapshot,
    getVisibility: selectVisibilityExtractor(getVisibility),
    visibilityThreshold: selectVisibilityThreshold(visibilityThreshold),
  };
}

/**
 * Choose the visibility extractor, defaulting to the built-in helper.
 * @param {((snapshot: *) => number) | ((snapshot: *) => number | undefined) | undefined} getVisibility Candidate extractor.
 * @returns {(snapshot: *) => number} Resolved extractor function.
 */
function selectVisibilityExtractor(getVisibility) {
  if (typeof getVisibility === 'function') {
    return /** @type {(snapshot: *) => number} */ (getVisibility);
  }

  return getVariantVisibility;
}

/**
 * Resolve the visibility threshold, falling back to the default.
 * @param {number | undefined} visibilityThreshold Candidate threshold.
 * @returns {number} Resolved visibility threshold.
 */
function selectVisibilityThreshold(visibilityThreshold) {
  if (visibilityThreshold === undefined) {
    return DEFAULT_VISIBILITY_THRESHOLD;
  }

  return visibilityThreshold;
}

/**
 * Assert that the required variant visibility helpers are provided.
 * @param {(snapshot: *) => Promise<null>} removeVariantHtmlForSnapshot Render helper.
 * @param {(snapshot: *) => number} getVisibility Visibility extractor.
 * @returns {void}
 */
function assertVariantVisibilityDependencies(
  removeVariantHtmlForSnapshot,
  getVisibility
) {
  assertFunction(removeVariantHtmlForSnapshot, 'removeVariantHtmlForSnapshot');
  assertFunction(getVisibility, 'getVisibility');
}

/**
 * Create a handler that responds to visibility transitions crossing the threshold.
 * @param {{
 *   removeVariantHtmlForSnapshot: (snapshot: import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike) => Promise<null>,
 *   getVisibility: (snapshot: import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike) => number,
 *   visibilityThreshold: number,
 * }} params Transition dependencies.
 * @returns {(change: { before: import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike, after: import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike | { exists: boolean } }) => Promise<null>} Handler invoked when the snapshot visibility crosses the threshold.
 */
function createVisibilityTransitionHandler(params) {
  const { removeVariantHtmlForSnapshot, getVisibility, visibilityThreshold } =
    params;

  return async function visibilityTransition({ before, after }) {
    const beforeVisibility = getVisibility(before);
    const afterVisibility = getVisibility(
      /** @type {import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike} */ (
        after
      )
    );

    if (
      shouldRemoveRenderedHtml(
        beforeVisibility,
        afterVisibility,
        visibilityThreshold
      )
    ) {
      return removeVariantHtmlForSnapshot(
        /** @type {import('firebase-admin/firestore').DocumentSnapshot | SnapshotLike} */ (
          after
        )
      );
    }

    return null;
  };
}

/**
 * Bind the delete path and transition handler into the Firestore trigger handler.
 * @param {(snapshot: *) => Promise<null>} removeVariantHtmlForSnapshot Rendered HTML remover.
 * @param {(params: { before: *, after: * }) => Promise<null>} visibilityTransition Visibility transition handler.
 * @returns {(change: { before: *, after: { exists: boolean } }) => Promise<null>} Firestore change handler.
 */
function createVisibilityChangeHandler(
  removeVariantHtmlForSnapshot,
  visibilityTransition
) {
  return async function handleVariantVisibilityChange(change) {
    const before = change.before;
    const after = change.after;

    if (wasDocumentDeleted(after)) {
      return removeVariantHtmlForSnapshot(before);
    }

    return visibilityTransition({ before, after });
  };
}

/**
 * Determine whether the document after snapshot indicates deletion.
 * @param {{ exists?: boolean } | null | undefined} after After snapshot.
 * @returns {boolean} True when the document no longer exists.
 */
function wasDocumentDeleted(after) {
  return Boolean(after && !after.exists);
}

/**
 * Decide whether the visibility change should remove rendered HTML.
 * @param {number} beforeVisibility Visibility before the update.
 * @param {number} afterVisibility Visibility after the update.
 * @param {number} threshold Threshold for removal.
 * @returns {boolean} True when visibility dropped below the threshold.
 */
function shouldRemoveRenderedHtml(
  beforeVisibility,
  afterVisibility,
  threshold
) {
  return beforeVisibility >= threshold && afterVisibility < threshold;
}
