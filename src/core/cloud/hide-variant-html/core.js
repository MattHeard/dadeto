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

    const loadResult =
      (await loadPageForVariant({ variantId, variantData, pageRef })) ?? null;

    let page = loadResult;
    if (loadResult && typeof loadResult === 'object' && 'page' in loadResult) {
      page = loadResult.page;
    }

    let resolvedVariantData = variantData;
    if (
      resolvedVariantData === undefined &&
      loadResult &&
      typeof loadResult === 'object' &&
      'variant' in loadResult
    ) {
      resolvedVariantData = loadResult.variant;
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
