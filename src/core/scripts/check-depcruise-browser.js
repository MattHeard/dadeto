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
 * Create a reader for the browser-main source and its repo-relative identity.
 * @param {BrowserScanDeps['readFileSync']} readFileSync Source reader.
 * @param {string} rootDir Repository root.
 * @param {string} sourceRoot Core source root.
 * @param {BrowserScanDeps['pathModule']} pathModule Path operations.
 * @returns {() => {filePath: string, source: string}} Browser-main source reader.
 */
export function createBrowserMainSourceReader(
  readFileSync,
  rootDir,
  sourceRoot,
  pathModule
) {
  return () => {
    const absolutePath = pathModule.resolve(
      rootDir,
      sourceRoot,
      ['browser', 'main.js'].join('/')
    );
    return {
      filePath: toRepoRelativePath(rootDir, absolutePath, pathModule),
      source: readFileSync(absolutePath, 'utf8'),
    };
  };
}

/**
 * Capture the analyzer and allowlist used to identify browser globals.
 * @param {BrowserScanDeps['scopeAnalysisDeps']} scopeAnalysisDeps Parser dependencies.
 * @param {string[]} allowedGlobals Browser globals to report.
 * @returns {(source: string) => string[]} Browser-global finder.
 */
export function createBrowserMainGlobalFinder(
  scopeAnalysisDeps,
  allowedGlobals
) {
  return source =>
    findCoreBrowserGlobalsInSource(source, scopeAnalysisDeps, allowedGlobals);
}

/**
 * Apply browser-main policy to a source reader and global finder.
 * @param {() => {filePath: string, source: string}} readBrowserMainSource Browser-main source capability.
 * @param {(source: string) => string[]} findBrowserGlobals Browser-global policy capability.
 * @returns {Array<{filePath: string, globals: string[]}>} Fresh violations for the browser entrypoint.
 */
export function scanBrowserMainPolicy(
  readBrowserMainSource,
  findBrowserGlobals
) {
  const { filePath, source } = readBrowserMainSource();
  const globals = findBrowserGlobals(stripBrowserMainPolicyNoise(source));
  return globals.length === 0 ? [] : [{ filePath, globals }];
}

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
  const findBrowserGlobalReferences = createBrowserGlobalReferenceFinder(
    scopeAnalysisDeps,
    allowedGlobals
  );
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
  // Stryker disable next-line StringLiteral: the fallback literal is
  // unobservable because the no-handle return uses the original source.
  const lines = (source ?? '').split('\n');
  const startIndex = lines.findIndex(line =>
    line.trimStart().startsWith('export function createMainHandle')
  );

  // Stryker disable next-line all -- index zero returns the same slice whether
  // the comparison is strict or inclusive.
  // same slice whether the comparison is strict or inclusive.
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
