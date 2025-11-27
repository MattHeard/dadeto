import { DEFAULT_BUCKET_NAME } from './cloud-core.js';

const DEFAULT_VISIBILITY_THRESHOLD = 0.5;

/**
 * Ensure a dependency is a callable function.
 * @param {string} name Identifier used for error reporting.
 * @param {*} dependency Candidate dependency to validate.
 */
function assertFunctionDependency(name, dependency) {
  if (typeof dependency !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

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
 *
 * @param loadResult
 */
function normalizeLoadResultValue(loadResult) {
  if (typeof loadResult !== 'object') {
    return { page: loadResult, variant: null };
  }

  return normalizeObjectLoadResult(loadResult);
}

/**
 *
 * @param loadResult
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
 *
 * @param value
 */
function hasPageOrVariant(value) {
  if ('page' in value) {
    return true;
  }
  return 'variant' in value;
}

/**
 *
 * @param value
 */
function normalizeNullableField(value) {
  if (isNullish(value)) {
    return null;
  }
  return value;
}

/**
 *
 * @param value
 */
function isNullish(value) {
  return value === undefined || value === null;
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
 *
 * @param loadedVariant
 */
function resolveLoadedVariant(loadedVariant) {
  if (loadedVariant === undefined) {
    return undefined;
  }

  return loadedVariant;
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
  assertFunctionDependency('loadPageForVariant', loadPageForVariant);
  assertFunctionDependency('buildVariantPath', buildVariantPath);
  assertFunctionDependency('deleteRenderedFile', deleteRenderedFile);

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

    if (!page) {
      return null;
    }

    const resolvedVariantData = resolveVariantData({
      hasProvidedData: hasVariantData,
      providedData: variantData,
      loadedVariant: variant,
    });

    const path = await buildVariantPath({
      variantId: variantId ?? null,
      variantData: resolvedVariantData,
      page,
    });

    await deleteRenderedFile(path);

    return null;
  };
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
    if (!isValidPath(path)) {
      return Promise.resolve();
    }

    return storage
      .bucket(validatedBucketName)
      .file(path)
      .delete({ ignoreNotFound: true })
      .then(() => undefined);
  };
}

/**
 * Validate bucket name.
 * @param {unknown} bucketName Bucket name.
 * @returns {string} Bucket.
 */
function validateBucketName(bucketName) {
  if (typeof bucketName !== 'string' || bucketName.trim() === '') {
    throw new TypeError('bucketName must be a non-empty string');
  }

  return bucketName;
}

/**
 * Validate storage exposes bucket helper.
 * @param {unknown} storage Storage.
 * @returns {void}
 */
function validateStorage(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage.bucket must be a function');
  }
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
  if (page && typeof page.number === 'number') {
    return String(page.number);
  }

  return '';
}

/**
 * Extract variant name.
 * @param {{ name?: unknown }} variantData Variant data.
 * @returns {string} Variant name segment.
 */
function extractVariantName(variantData) {
  if (variantData && typeof variantData.name === 'string') {
    return variantData.name;
  }

  return '';
}

/**
 * Create a helper that adapts Firestore snapshots into the removeVariantHtml payload.
 * @param {(payload?: RemoveVariantHtmlPayload) => Promise<null>} removeVariantHtml Remove helper produced by createRemoveVariantHtml.
 * @returns {(snapshot: { id: string, data?: () => *, ref?: { parent?: { parent?: * } } }) => Promise<null>} Snapshot adapter.
 */
export function createRemoveVariantHtmlForSnapshot(removeVariantHtml) {
  assertFunctionDependency('removeVariantHtml', removeVariantHtml);

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
  if (typeof snapshot.data === 'function') {
    return snapshot.data();
  }

  return undefined;
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
 *
 * @param ref
 */
function resolveParentPageRef(ref) {
  if (!ref || !ref.parent || !ref.parent.parent) {
    return null;
  }

  return ref.parent.parent;
}

/**
 * Extract the visibility score from a Firestore snapshot.
 * @param {{ data?: () => * } | null | undefined} snapshot Firestore snapshot.
 * @returns {number} Visibility value or zero when unavailable.
 */
export function getVariantVisibility(snapshot) {
  const data = resolveSnapshotData(snapshot);
  return extractVisibility(data);
}

/**
 *
 * @param snapshot
 */
function resolveSnapshotData(snapshot) {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
}

/**
 *
 * @param data
 */
function extractVisibility(data) {
  if (data && typeof data.visibility === 'number') {
    return data.visibility;
  }

  return 0;
}

/**
 * Create a handler that determines whether a variant's rendered HTML should be removed.
 * @param {object} options Configuration for the handler.
 * @param {(snapshot: *) => Promise<null>} options.removeVariantHtmlForSnapshot Helper that removes rendered HTML for a snapshot.
 * @param {(snapshot: *) => number} [options.getVisibility] Function that extracts visibility from a snapshot.
 * @param {number} [options.visibilityThreshold] Threshold at which the HTML remains visible.
 * @returns {(change: { before: *, after: { exists: boolean } }) => Promise<null>} Firestore change handler.
 */
export function createHandleVariantVisibilityChange({
  removeVariantHtmlForSnapshot,
  getVisibility = getVariantVisibility,
  visibilityThreshold = DEFAULT_VISIBILITY_THRESHOLD,
}) {
  assertFunctionDependency(
    'removeVariantHtmlForSnapshot',
    removeVariantHtmlForSnapshot
  );
  assertFunctionDependency('getVisibility', getVisibility);

  const visibilityTransition = createVisibilityTransitionHandler({
    removeVariantHtmlForSnapshot,
    getVisibility,
    visibilityThreshold,
  });

  return createVisibilityChangeHandler(
    removeVariantHtmlForSnapshot,
    visibilityTransition
  );
}

/**
 * Create a handler that responds to visibility transitions crossing the threshold.
 * @param {{
 *   removeVariantHtmlForSnapshot: (snapshot: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>,
 *   getVisibility: (snapshot: import('firebase-admin/firestore').DocumentSnapshot) => number,
 *   visibilityThreshold: number,
 * }} params Transition dependencies.
 * @returns {(change: { before: import('firebase-admin/firestore').DocumentSnapshot, after: { exists: boolean } }) => Promise<null>} Handler invoked when the snapshot visibility crosses the threshold.
 */
function createVisibilityTransitionHandler({
  removeVariantHtmlForSnapshot,
  getVisibility,
  visibilityThreshold,
}) {
  return async function visibilityTransition({ before, after }) {
    const beforeVisibility = getVisibility(before);
    const afterVisibility = getVisibility(after);

    if (
      beforeVisibility >= visibilityThreshold &&
      afterVisibility < visibilityThreshold
    ) {
      return removeVariantHtmlForSnapshot(after);
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

    if (!after.exists) {
      return removeVariantHtmlForSnapshot(before);
    }

    return visibilityTransition({ before, after });
  };
}
