/** Logic source roots during the incremental directory migration. */
export const LOGIC_SOURCE_ROOTS = Object.freeze([
  'src/core',
  'src/logic/core',
  'src/logic/boundary',
]);

/**
 * Classify a normalized repository-relative JavaScript path for coverage.
 * @param {string} filePath Canonical repository path supplied by the caller.
 * @returns {boolean} Whether the path belongs to a measured logic root.
 */
export function isLogicJavaScriptPath(filePath) {
  return (
    filePath.endsWith('.js') &&
    LOGIC_SOURCE_ROOTS.some(root => filePath.startsWith(`${root}/`))
  );
}
