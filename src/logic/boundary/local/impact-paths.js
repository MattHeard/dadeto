const SOURCE_ROOT = 'src/';
const UNIT_TEST_ROOT = 'test/';

/**
 * Normalize an untrusted path primitive without coercion.
 * @param {unknown} value Untrusted path candidate.
 * @returns {string} Safe repository-relative path, or empty when rejected.
 */
export function normalizeImpactPath(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (
    normalized.startsWith('/') ||
    normalized.split('/').includes('..') ||
    normalized.includes('\0') ||
    normalized.includes('\n') ||
    normalized.includes('\r')
  )
    return '';
  return normalized;
}

/**
 * Classify a normalized path under the existing source/unit-test policy.
 * @param {string} path Normalized repository-relative path.
 * @returns {'source' | 'test' | ''} Supported kind or rejection.
 */
export function classifyImpactPath(path) {
  if (path.startsWith(SOURCE_ROOT) && path.endsWith('.js')) return 'source';
  if (
    path.startsWith(UNIT_TEST_ROOT) &&
    path.endsWith('.test.js') &&
    !path.startsWith('test/e2e/')
  )
    return 'test';
  return '';
}

/**
 * Interpret an optional finite CLI candidate list into normalized unit paths.
 * Absence produces the final empty domain result, without a fabricated raw path.
 * @param {unknown[] | undefined} relatedTestPaths Candidate list from CLI selection.
 * @returns {{ok: true, paths: string[]} | {ok: false, error: unknown}} Unique supported paths or the original structural error.
 */
export function parseRelatedImpactPaths(relatedTestPaths) {
  try {
    const paths =
      relatedTestPaths === undefined
        ? []
        : [...new Set(relatedTestPaths.map(normalizeImpactPath))].filter(
            path => classifyImpactPath(path) === 'test'
          );
    return { ok: true, paths };
  } catch (error) {
    return { ok: false, error };
  }
}
