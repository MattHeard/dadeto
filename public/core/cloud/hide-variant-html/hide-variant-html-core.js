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

    const loadResult =
      (await loadPageForVariant({ variantId, variantData, pageRef })) ?? null;

    let page = loadResult;
    if (loadResult && typeof loadResult === 'object' && 'page' in loadResult) {
      page = loadResult.page;
    }

    let resolvedVariantData;
    if (hasVariantData) {
      resolvedVariantData = variantData;
    }
    if (
      !hasVariantData &&
      loadResult &&
      typeof loadResult === 'object' &&
      'variant' in loadResult
    ) {
      resolvedVariantData = loadResult.variant ?? null;
    }

    if (!page) {
      return null;
    }

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
  const pageNumber = typeof page?.number === 'number' ? page.number : '';
  const variantName =
    typeof variantData?.name === 'string' ? variantData.name : '';

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

    const data = typeof snapshot.data === 'function' ? snapshot.data() : undefined;
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

  return typeof visibility === 'number' ? visibility : 0;
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
    const before = change?.before ?? null;
    const after = change?.after ?? null;

    if (!after?.exists) {
      return removeVariantHtmlForSnapshot(before);
    }

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
