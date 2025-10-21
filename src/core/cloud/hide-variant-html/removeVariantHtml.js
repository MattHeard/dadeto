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
 * Create a helper that deletes rendered HTML for a variant.
 * @param {{
 *   loadPageForVariant: (payload: {
 *     variantId?: string | null,
 *     variantData?: unknown,
 *     pageRef?: unknown,
 *   }) => Promise<
 *     | { page: unknown, variant?: unknown }
 *     | unknown
 *     | null
 *   >,
 *   buildVariantPath: (payload: {
 *     variantId: string | null,
 *     variantData: unknown,
 *     page: unknown,
 *   }) => Promise<string> | string,
 *   deleteRenderedFile: (path: string) => Promise<unknown>,
 * }} dependencies Collaborators required to remove the HTML artifact.
 * @returns {(payload: {
 *   variantId?: string | null,
 *   variantData?: unknown,
 *   pageRef?: unknown,
 * }) => Promise<null>} Helper that removes the rendered HTML file when possible.
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

    const page =
      loadResult && typeof loadResult === 'object' && 'page' in loadResult
        ? loadResult.page
        : loadResult;
    const resolvedVariantData =
      variantData ??
      (loadResult && typeof loadResult === 'object'
        ? loadResult.variant
        : null);

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
