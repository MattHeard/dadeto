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

  if (typeof loadResult !== 'object') {
    return { page: loadResult, variant: null };
  }

  if ('page' in loadResult || 'variant' in loadResult) {
    return {
      page: loadResult.page ?? null,
      variant: loadResult.variant ?? null,
    };
  }

  return { page: loadResult, variant: undefined };
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

  if (loadedVariant !== undefined) {
    return loadedVariant ?? null;
  }

  return undefined;
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
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('storage.bucket must be a function');
  }
  if (typeof bucketName !== 'string' || bucketName.trim() === '') {
    throw new TypeError('bucketName must be a non-empty string');
  }

  return function deleteRenderedFile(path) {
    if (typeof path !== 'string' || path.length === 0) {
      return Promise.resolve();
    }

    return storage
      .bucket(bucketName)
      .file(path)
      .delete({ ignoreNotFound: true })
      .then(() => undefined);
  };
}

/**
 * Build the rendered HTML path for a variant page.
 * @param {{ page: *, variantData?: * }} payload Page and variant details.
 * @returns {string} Relative path to the rendered HTML file.
 */
export function buildVariantPath({ page, variantData }) {
  let pageNumber = '';
  if (typeof page?.number === 'number') {
    pageNumber = page.number;
  }

  let variantName = '';
  if (typeof variantData?.name === 'string') {
    variantName = variantData.name;
  }

  return `p/${pageNumber}${variantName}.html`;
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

    let data;
    if (typeof snapshot.data === 'function') {
      data = snapshot.data();
    }
    const pageRef = snapshot.ref?.parent?.parent ?? null;

    return removeVariantHtml({
      variantId: snapshot.id ?? null,
      variantData: data,
      pageRef,
    });
  };
}

/**
 * Extract the visibility score from a Firestore snapshot.
 * @param {{ data?: () => * } | null | undefined} snapshot Firestore snapshot.
 * @returns {number} Visibility value or zero when unavailable.
 */
export function getVariantVisibility(snapshot) {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return 0;
  }

  const data = snapshot.data();
  const visibility = data?.visibility;

  if (typeof visibility === 'number') {
    return visibility;
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

  return async function handleVariantVisibilityChange(change) {
    const before = change.before;
    const after = change.after;

    if (!after.exists) {
      return removeVariantHtmlForSnapshot(before);
    } else {
      const beforeVisibility = getVisibility(before);
      const afterVisibility = getVisibility(after);

      if (
        beforeVisibility >= visibilityThreshold &&
        afterVisibility < visibilityThreshold
      ) {
        return removeVariantHtmlForSnapshot(after);
      }

      return null;
    }
  };
}
