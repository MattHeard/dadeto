import { createBrowserGlobalReferenceFinder } from '../local/check-depcruise-scope.js';

/**
 * @typedef {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   rootDir: string,
 *   sourceRoot: string,
 *   pathModule: {
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} BrowserScanDeps
 */
/**
 * Find browser globals in a source file.
 * @param {string} source Source text.
 * @param {BrowserScanDeps['scopeAnalysisDeps']} scopeAnalysisDeps Parser dependencies.
 * @param {string[]} allowedGlobals Browser globals to report.
 * @returns {string[]} Browser globals found in the source.
 */
export function findCoreBrowserGlobalsInSource(
  source,
  scopeAnalysisDeps,
  allowedGlobals
) {
  const findBrowserGlobalReferences =
    createBrowserGlobalReferenceFinder(scopeAnalysisDeps);
  return findBrowserGlobalReferences(source).filter(globalName =>
    allowedGlobals.includes(globalName)
  );
}

/**
 * Remove non-executable module text from the browser main policy scan.
 * @param {string | null | undefined} source Source text.
 * @returns {string} Source text with import and doc-comment lines removed.
 */
export function stripBrowserMainPolicyNoise(source) {
  const lines = (source ?? '').split('\n');
  const startIndex = lines.findIndex(line =>
    line.trimStart().startsWith('export function createMainHandle')
  );

  if (startIndex < 0) {
    return source ?? '';
  }

  return lines.slice(startIndex).join('\n');
}

/**
 * Convert a path to a repo-relative POSIX path.
 * @param {string} rootDir Repository root.
 * @param {string} absolutePath Absolute file path.
 * @param {{ relative: (from: string, to: string) => string, sep: string }} pathModule Path helper.
 * @returns {string} Repo-relative path.
 */
export function toRepoRelativePath(rootDir, absolutePath, pathModule) {
  return pathModule
    .relative(rootDir, absolutePath)
    .replaceAll(pathModule.sep, '/');
}
