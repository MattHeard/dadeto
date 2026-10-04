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
 * Read and scan the special browser-main boundary, excluding its wiring preamble.
 * @param {Pick<BrowserScanDeps, 'sourceRoot'|'scopeAnalysisDeps'> & {allowedGlobals: string[]}} policy Default scan policy supplied by the gate.
 * @param {Omit<BrowserScanDeps, 'sourceRoot'|'scopeAnalysisDeps'> & Partial<Pick<BrowserScanDeps, 'sourceRoot'|'scopeAnalysisDeps'>>} deps File and scope dependencies.
 * @returns {Array<{filePath: string, globals: string[]}>} Fresh violations for the browser entrypoint.
 */
export function scanBrowserMainPolicy(policy, deps) {
  const {
    readFileSync,
    rootDir,
    sourceRoot = policy.sourceRoot,
    pathModule,
    scopeAnalysisDeps = policy.scopeAnalysisDeps,
  } = deps;
  const filePath = pathModule.resolve(
    rootDir,
    sourceRoot,
    ['browser', 'main.js'].join('/')
  );
  const globals = findCoreBrowserGlobalsInSource(
    stripBrowserMainPolicyNoise(readFileSync(filePath, 'utf8')),
    scopeAnalysisDeps,
    policy.allowedGlobals
  );
  return globals.length === 0
    ? []
    : [
        {
          filePath: toRepoRelativePath(rootDir, filePath, pathModule),
          globals,
        },
      ];
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
