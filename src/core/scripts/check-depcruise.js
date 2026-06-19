import * as gateUtils from './gate-utils.js';
import * as commonCore from '../commonCore.js';
import {
  findCoreBrowserGlobalsInSource,
  stripBrowserMainPolicyNoise,
  toRepoRelativePath,
} from './check-depcruise-browser.js';
const { requirePathModule } = commonCore;

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
const DEFAULT_CONFIG_PATH = 'dependency-cruiser.config.cjs';
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };
const DEFAULT_SPAWN_RESULT = { status: 0, signal: null };
const DEFAULT_SCOPE_ANALYSIS_DEPS = {
  /**
   * @param {string | undefined} source Source text.
   * @returns {string} Normalized source text.
   */
  parseSourceForScopeAnalysis(source) {
    return source ?? '';
  },
  analyzeScope() {
    return { scopes: [] };
  },
};
/**
 * @typedef {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} CoreFileScanDeps
 * @typedef {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   rootDir: string,
 *   sourceRoot: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps?: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} CoreBrowserMainDeps
 */
const MATH_RANDOM_NEEDLE = ['Math', 'random'].join('.');
const CORE_GLOBALS = ['localStorage', 'window', 'document'];

/**
 * Create the command handler that runs dependency-cruiser and enforces the
 * core injected-random policy.
 * @param {{
 *   spawnImpl?: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, violations: number }} Dependency gate handler.
 */
export function createCheckDepcruiseHandle(options = {}) {
  return createDepcruiseGateHandle(
    /** @type {Parameters<typeof createDepcruiseGateHandle>[0]} */ (
      normalizeCheckDepcruiseOptions(options)
    )
  );
}

/**
 * @param {CoreFileScanDeps} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, occurrences: number }>} Files that directly use the injected random source.
 */
export function findCoreMathRandomViolations(
  /** @type {CoreFileScanDeps} */ deps
) {
  return findCoreViolationsWithScanner(
    deps,
    countMathRandomOccurrences,
    (filePath, occurrences) => ({ filePath, occurrences })
  );
}

/**
 * @param {CoreBrowserMainDeps & { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> }} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, globals: string[] }>} Files that directly use browser globals.
 */
export function findCoreGlobalViolations(deps) {
  return collectCoreBrowserGlobalViolations({
    ...deps,
    scopeAnalysisDeps: deps.scopeAnalysisDeps ?? DEFAULT_SCOPE_ANALYSIS_DEPS,
  });
}

/**
 * @param {CoreBrowserMainDeps & { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> }} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, globals: string[] }>} Files that directly use browser globals.
 */
export function findCoreBrowserMainGlobalViolations(deps) {
  const {
    readFileSync,
    rootDir,
    sourceRoot = DEFAULT_SOURCE_ROOT,
    pathModule,
    scopeAnalysisDeps = DEFAULT_SCOPE_ANALYSIS_DEPS,
  } = deps;
  const filePath = pathModule.resolve(
    rootDir,
    sourceRoot,
    ['browser', 'main.js'].join('/')
  );
  const globals = findCoreBrowserGlobalsInSource(
    stripBrowserMainPolicyNoise(readFileSync(filePath, 'utf8')),
    scopeAnalysisDeps,
    CORE_GLOBALS
  );

  /** @type {Array<{ filePath: string, globals: string[] }>} */
  const globalsViolations = [];

  if (!isEmptyScanResult(globals)) {
    globalsViolations.push({
      filePath: toRepoRelativePath(rootDir, filePath, pathModule),
      globals,
    });
  }

  return globalsViolations;
}

export const checkDepcruiseTestUtils = {
  normalizeCheckDepcruiseOptions,
  scanQuotedString,
  isBoundary,
  isEmptyScanResult,
  defaultScopeAnalysisDeps: DEFAULT_SCOPE_ANALYSIS_DEPS,
  findCoreBrowserMainGlobalViolations,
  findCoreGlobalViolations,
  stripBrowserMainPolicyNoise,
  isBrowserGlobalAtIndex,
  hasFetchUsageAtIndex,
};

/**
 * Normalize the gate dependencies with default repository paths.
 * @param {{
 *   spawnImpl?: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync?: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps?: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} [options] Optional dependencies.
 * @returns {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} Normalized dependencies.
 */
function normalizeCheckDepcruiseOptions(options = {}) {
  return {
    spawnImpl: gateUtils.useDefaultValue(
      options.spawnImpl,
      () => DEFAULT_SPAWN_RESULT
    ),
    readFileSync: gateUtils.useDefaultValue(options.readFileSync, () => ''),
    readdirSync: gateUtils.useDefaultValue(options.readdirSync, () => []),
    stdout: gateUtils.useDefaultValue(options.stdout, DEFAULT_STDOUT),
    stderr: gateUtils.useDefaultValue(options.stderr, DEFAULT_STDERR),
    rootDir: gateUtils.useDefaultValue(options.rootDir, DEFAULT_ROOT_DIR),
    sourceRoot: gateUtils.useDefaultValue(
      options.sourceRoot,
      DEFAULT_SOURCE_ROOT
    ),
    configPath: gateUtils.useDefaultValue(
      options.configPath,
      DEFAULT_CONFIG_PATH
    ),
    pathModule: requirePathModule(options.pathModule),
    scopeAnalysisDeps: options.scopeAnalysisDeps ?? DEFAULT_SCOPE_ANALYSIS_DEPS,
  };
}

/**
 * Build the gate handler from normalized dependencies.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} deps Normalized dependencies.
 * @returns {() => { exitCode: number, violations: number }} Gate handler.
 */
function createDepcruiseGateHandle(deps) {
  return function handleDepcruiseGate() {
    return executeDepcruiseGate(deps);
  };
}

/**
 * Execute dependency-cruiser and the core random policy scan.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scopeAnalysisDeps: {
 *     parseSourceForScopeAnalysis: (source: string) => unknown,
 *     analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> },
 *   },
 * }} deps Gate dependencies.
 * @returns {{ exitCode: number, violations: number }} Gate outcome.
 */
function executeDepcruiseGate({
  spawnImpl,
  readFileSync,
  readdirSync,
  stdout,
  stderr,
  rootDir,
  sourceRoot,
  configPath,
  pathModule,
  scopeAnalysisDeps,
}) {
  const { launchFailure } = gateUtils.runGateCommand({
    spawnImpl,
    command: 'depcruise',
    args: ['--config', configPath, 'src'],
    rootDir,
    stderr,
    launchLabel: 'Dependency-cruiser gate',
    commandLabel: 'depcruise',
  });

  if (launchFailure) {
    return { exitCode: launchFailure.exitCode, violations: 0 };
  }

  /** @type {CoreFileScanDeps} */
  const sharedScanDeps = {
    readFileSync,
    readdirSync,
    rootDir,
    sourceRoot,
    pathModule,
  };
  /** @type {CoreBrowserMainDeps & { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, scopeAnalysisDeps: { parseSourceForScopeAnalysis: (source: string) => unknown, analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> } } }} */
  const browserScanDeps = {
    ...sharedScanDeps,
    scopeAnalysisDeps,
  };

  const violations = findCoreMathRandomViolations(sharedScanDeps);
  const browserGlobalViolations =
    collectCoreBrowserGlobalViolations(browserScanDeps);

  if (browserGlobalViolations.length > 0) {
    reportViolations({
      stderr,
      violations: browserGlobalViolations,
      countLabel: 'Dependency-cruiser core global policy',
      /**
       * @param {{ filePath: string, globals: string[] }} violation Violation details.
       * @returns {string} Violation description.
       */
      describeViolation: ({ filePath, globals }) =>
        `${filePath} uses browser globals directly: ${globals.join(', ')}.`,
    });
    return { exitCode: 1, violations: browserGlobalViolations.length };
  }

  if (violations.length > 0) {
    reportViolations({
      stderr,
      violations,
      countLabel: 'Dependency-cruiser core policy',
      /**
       * @param {{ filePath: string, occurrences: number }} violation Violation details.
       * @returns {string} Violation description.
       */
      describeViolation: ({ filePath, occurrences }) =>
        `${filePath} uses the injected random source directly ${occurrences} time${gateUtils.pluralizeCount(occurrences)}.`,
    });
    return { exitCode: 1, violations: violations.length };
  }

  stdout.write('Checked dependency-cruiser: no core global dependencies.\n');
  return { exitCode: 0, violations: 0 };
}

/**
 * Read JavaScript files recursively from a directory.
 * @param {string} dirPath Directory to scan.
 * @param {(dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>} readdirSync Directory reader.
 * @param {{ join: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 * @returns {string[]} Absolute JavaScript file paths.
 */
function listJsFiles(dirPath, readdirSync, pathModule) {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap(entry => {
    const entryPath = pathModule.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listJsFiles(entryPath, readdirSync, pathModule);
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      return [entryPath];
    }

    return [];
  });
}

/**
 * Scan each JavaScript file in a directory tree for violations.
 * @param {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   scanSource: (source: string) => any,
 *   createViolation: (filePath: string, scanResult: any) => any,
 * }} deps Scan dependencies.
 * @returns {any[]} Violations discovered in source files.
 */
function collectJsViolations({
  readFileSync,
  readdirSync,
  rootDir,
  sourceRoot,
  pathModule,
  scanSource,
  createViolation,
}) {
  const sourceRootPath = pathModule.resolve(rootDir, sourceRoot);
  return listJsFiles(sourceRootPath, readdirSync, pathModule).flatMap(
    filePath => {
      const scanResult = scanSource(readFileSync(filePath, 'utf8'));

      if (isEmptyScanResult(scanResult)) {
        return [];
      }

      return [
        createViolation(
          toRepoRelativePath(rootDir, filePath, pathModule),
          scanResult
        ),
      ];
    }
  );
}

/**
 * Collect browser-global violations from all core files.
 * @param {CoreBrowserMainDeps & { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, scopeAnalysisDeps: { parseSourceForScopeAnalysis: (source: string) => unknown, analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> } } }} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, globals: string[] }>} Files that directly use browser globals.
 */
function collectCoreBrowserGlobalViolations(deps) {
  const readFileSync = deps.readFileSync;
  const readdirSync = deps.readdirSync;
  const rootDir = deps.rootDir;
  const sourceRoot = deps.sourceRoot;
  const pathModule = deps.pathModule;
  const scopeAnalysisDeps = deps.scopeAnalysisDeps;
  const sourceRootPath = pathModule.resolve(rootDir, sourceRoot);
  /** @type {Array<{ filePath: string, globals: string[] }>} */
  const globalsViolations = [];

  listJsFiles(sourceRootPath, readdirSync, pathModule).forEach(filePath => {
    const globals = findCoreBrowserGlobalsInSource(
      readFileSync(filePath, 'utf8'),
      scopeAnalysisDeps,
      CORE_GLOBALS
    );

    if (globals.length > 0) {
      globalsViolations.push({
        filePath: toRepoRelativePath(rootDir, filePath, pathModule),
        globals,
      });
    }
  });

  return globalsViolations;
}

/**
 * Collect violations from core JS files using a shared file scanner.
 * @param {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 * }} deps Core scan dependencies.
 * @param {(source: string) => any} scanSource Source scanner.
 * @param {(filePath: string, scanResult: any) => any} createViolation Violation builder.
 * @returns {any[]} Violations discovered in source files.
 */
function findCoreViolationsWithScanner(deps, scanSource, createViolation) {
  return collectJsViolations({
    ...deps,
    scanSource,
    createViolation,
  });
}

/**
 * Scan a quoted string segment.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {"'" | '"' } delimiter String delimiter.
 * @param {string} nextState Next scanner state.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanQuotedString(source, index, delimiter, nextState) {
  return scanDelimitedString(source, index, delimiter, nextState);
}

/**
 * @param {{
 *   stderr: { write: (text: string) => void },
 *   violations: Array<unknown>,
 *   countLabel: string,
 *   describeViolation: (violation: any) => string,
 * }} options Violation report options.
 */
function reportViolations({
  stderr,
  violations,
  countLabel,
  describeViolation,
}) {
  stderr.write(
    `${countLabel} found ${violations.length} violation${gateUtils.pluralizeCount(violations.length)}.\n`
  );

  violations.forEach(violation => {
    stderr.write(`${describeViolation(violation)}\n`);
  });
}

/**
 * Tell whether a scan result has no matches.
 * @param {unknown} scanResult Scan result.
 * @returns {boolean} True when the scan result is empty.
 */
function isEmptyScanResult(scanResult) {
  if (typeof scanResult === 'number') {
    return scanResult <= 0;
  }

  if (Array.isArray(scanResult)) {
    return scanResult.length === 0;
  }

  return !scanResult;
}

/**
 * Count direct random-source calls in a source file while skipping comments and strings.
 * @param {string} source Source text.
 * @returns {number} Number of direct uses.
 */
function countMathRandomOccurrences(source) {
  let count = 0;
  let index = 0;
  let state = 'code';

  while (index < source.length) {
    const scanStep = getMathRandomScanStep(source, index, state);
    count += scanStep.count;
    index = scanStep.nextIndex;
    state = scanStep.nextState;
  }

  return count;
}

/**
 * Tell whether the target browser global appears at a given index.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {string} identifier Browser global to match.
 * @returns {boolean} True when the browser global appears at the current index.
 */
function isBrowserGlobalAtIndex(source, index, identifier) {
  if (identifier === 'window' || identifier === 'document') {
    return (
      hasGlobalPropertyAccessAtIndex(source, index, identifier) ||
      hasBareGlobalUsageAtIndex(source, index, identifier)
    );
  }

  if (identifier === 'fetch') {
    return hasFetchUsageAtIndex(source, index);
  }

  if (identifier === 'localStorage') {
    return hasBareGlobalUsageAtIndex(source, index, identifier);
  }

  return false;
}

/**
 * Determine whether a browser global is used as a property access.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {string} identifier Browser global to match.
 * @returns {boolean} True when the source uses the global as a property access.
 */
function hasGlobalPropertyAccessAtIndex(source, index, identifier) {
  return hasDelimitedIdentifierAtIndex(source, index, identifier, '.');
}

/**
 * Determine whether fetch is used directly.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {boolean} True when fetch is used as a direct call or shorthand property.
 */
function hasFetchUsageAtIndex(source, index) {
  return hasDelimitedIdentifierAtIndex(
    source,
    index,
    'fetch',
    /[,(;\s\[\]\)]/u
  );
}

/**
 * Determine whether a browser global is used as a bare value.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {string} identifier Browser global to match.
 * @returns {boolean} True when the source uses the global as a bare value.
 */
function hasBareGlobalUsageAtIndex(source, index, identifier) {
  return hasDelimitedIdentifierAtIndex(source, index, identifier, isBoundary);
}

/**
 * Inspect one scanner step for the current state.
 * @param {string} source Source text.
 * @param {number} index Current index in the source.
 * @param {string} state Current scanner state.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan step result.
 */
function getMathRandomScanStep(source, index, state) {
  if (state === 'code') {
    return scanCodeForMathRandom(source, index);
  }

  if (state === 'line-comment') {
    return scanLineComment(source, index);
  }

  if (state === 'block-comment') {
    return scanBlockComment(source, index);
  }

  if (state === 'single-quote') {
    return scanDelimitedString(source, index, "'", 'code');
  }

  if (state === 'double-quote') {
    return scanDelimitedString(source, index, '"', 'code');
  }

  return scanDelimitedString(source, index, '`', 'template');
}

/**
 * Scan a code segment for the target random source and state transitions.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanCodeForMathRandom(source, index) {
  const needleLength = MATH_RANDOM_NEEDLE.length;

  const commentOrString = scanCodeForCommentOrString(source, index);
  if (commentOrString) {
    return commentOrString;
  }

  if (isMathRandomAtIndex(source, index)) {
    return createZeroCountScanResult(index + needleLength, 'code', 1);
  }

  return createZeroCountScanResult(index + 1, 'code');
}

/**
 * Build a scan result with an optional count.
 * @param {number} nextIndex Next source index.
 * @param {string} nextState Next scanner state.
 * @param {number | undefined} count Matched count.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function createZeroCountScanResult(nextIndex, nextState, count = 0) {
  return {
    count,
    nextIndex,
    nextState,
  };
}

/**
 * Determine whether a source fragment is a standalone identifier with the given trailing delimiter.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {string} identifier Identifier to match.
 * @param {string | RegExp | ((character: string | undefined) => boolean)} upperBoundaryTest Boundary test.
 * @returns {boolean} True when the identifier is present with valid boundaries.
 */
function hasDelimitedIdentifierAtIndex(
  source,
  index,
  identifier,
  upperBoundaryTest
) {
  if (!source.startsWith(identifier, index)) {
    return false;
  }

  const hasLowerBoundary = isBoundary(source[index - 1]);
  const nextCharacter = source[index + identifier.length];

  if (nextCharacter === ':') {
    return false;
  }

  let hasUpperBoundary = false;
  if (typeof upperBoundaryTest === 'function') {
    hasUpperBoundary = upperBoundaryTest(nextCharacter);
  } else if (upperBoundaryTest instanceof RegExp) {
    hasUpperBoundary = upperBoundaryTest.test(nextCharacter ?? '');
  } else {
    hasUpperBoundary = nextCharacter === upperBoundaryTest;
  }

  return hasLowerBoundary && hasUpperBoundary;
}

/**
 * Detect comment or string boundaries at the current index.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string } | null} Scan result when a boundary is found.
 */
function scanCodeForCommentOrString(source, index) {
  const current = source[index];
  const next = source[index + 1];

  if (current === '/' && next === '/') {
    return createZeroCountScanResult(index + 2, 'line-comment');
  }

  if (current === '/' && next === '*') {
    return createZeroCountScanResult(index + 2, 'block-comment');
  }

  if (current === "'") {
    return createZeroCountScanResult(index + 1, 'single-quote');
  }

  if (current === '"') {
    return createZeroCountScanResult(index + 1, 'double-quote');
  }

  if (current === '`') {
    return createZeroCountScanResult(index + 1, 'template');
  }

  return null;
}

/**
 * Scan through a line comment.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanLineComment(source, index) {
  if (source[index] === '\n') {
    return createZeroCountScanResult(index + 1, 'code');
  }

  return createZeroCountScanResult(index + 1, 'line-comment');
}

/**
 * Scan through a block comment.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanBlockComment(source, index) {
  const isClosed = source[index] === '*' && source[index + 1] === '/';
  if (isClosed) {
    return createZeroCountScanResult(index + 2, 'code');
  }

  return createZeroCountScanResult(index + 1, 'block-comment');
}

/**
 * Scan through a delimited string-like region.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {string} delimiter Delimiter character.
 * @param {string} nextState State to resume when the delimiter has not been closed.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanDelimitedString(source, index, delimiter, nextState) {
  if (source[index] === '\\') {
    return createZeroCountScanResult(index + 2, nextState);
  }

  if (source[index] === delimiter) {
    return createZeroCountScanResult(index + 1, 'code');
  }

  return createZeroCountScanResult(index + 1, nextState);
}

/**
 * Tell whether the target random source appears at a given index.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {boolean} True when the target appears at the current index.
 */
function isMathRandomAtIndex(source, index) {
  return hasDelimitedIdentifierAtIndex(
    source,
    index,
    MATH_RANDOM_NEEDLE,
    isBoundary
  );
}

/**
 * Tell whether a character can bound an identifier.
 * @param {string | undefined} character Character to inspect.
 * @returns {boolean} True when the character is not part of an identifier.
 */
function isBoundary(character) {
  if (!character) {
    return true;
  }

  return !/[A-Za-z0-9_$]/u.test(character);
}
