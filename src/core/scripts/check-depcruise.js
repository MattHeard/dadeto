import * as gateUtils from './gate-utils.js';
import * as commonCore from '../commonCore.js';
import { DEFAULT_STDOUT, DEFAULT_STDERR } from './gate-script-defaults.js';
import {
  findCoreBrowserGlobalsInSource,
  scanBrowserMainPolicy,
  stripBrowserMainPolicyNoise,
  toRepoRelativePath,
} from './check-depcruise-browser.js';
const { requirePathModule } = commonCore;

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
const DEFAULT_CONFIG_PATH = 'dependency-cruiser.config.cjs';
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
 * @typedef {Pick<DepcruiseGateDeps, 'readFileSync'|'readdirSync'|'rootDir'|'sourceRoot'|'pathModule'>} CoreFileScanDeps
 * @typedef {Omit<CoreFileScanDeps, 'readdirSync'> & {scopeAnalysisDeps?: DepcruiseGateDeps['scopeAnalysisDeps']}} CoreBrowserMainDeps
 */
/**
 * @typedef {{
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
 * }} DepcruiseGateDeps
 * @typedef {CoreBrowserMainDeps & Pick<CoreFileScanDeps, 'readdirSync'>} CoreBrowserScanDeps
 */
const MATH_RANDOM_NEEDLE = ['Math', 'random'].join('.');
const CORE_GLOBALS = ['localStorage', 'window', 'document'];
/** @type {Partial<Record<string, {width: number, state: string}>>} */
const CODE_BOUNDARIES = {
  '//': { width: 2, state: 'line-comment' },
  '/*': { width: 2, state: 'block-comment' },
  "'": { width: 1, state: 'single-quote' },
  '"': { width: 1, state: 'double-quote' },
  '`': { width: 1, state: 'template' },
};

/** @typedef {{ filePath: string, occurrences: number }} MathRandomViolation */
/** @typedef {{ filePath: string, globals: string[] }} BrowserGlobalViolation */
/** @typedef {MathRandomViolation | BrowserGlobalViolation} Violation */

/**
 * Create the dependency and injected-random gate.
 * @param {Partial<DepcruiseGateDeps>} [options] Optional gate dependencies.
 * @returns {() => {exitCode: number, violations: number}} Gate handler.
 */
export function createCheckDepcruiseHandle(options = {}) {
  const dependencies = normalizeCheckDepcruiseOptions(options);
  return executeDepcruiseGate.bind(null, dependencies);
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
    createMathRandomViolation
  );
}

/**
 * Project a counted random-source occurrence into the gate's violation format.
 * @param {string} filePath Repository-relative source path.
 * @param {number} occurrences Count reported by the source scanner.
 * @returns {MathRandomViolation} A fresh violation record.
 */
function createMathRandomViolation(filePath, occurrences) {
  return { filePath, occurrences };
}

/**
 * @param {CoreBrowserScanDeps} deps Filesystem dependencies.
 * @returns {BrowserGlobalViolation[]} Files that directly use browser globals.
 */
export function findCoreGlobalViolations(deps) {
  const browserScan = {
    ...deps,
    scopeAnalysisDeps: deps.scopeAnalysisDeps ?? DEFAULT_SCOPE_ANALYSIS_DEPS,
  };
  const violations = collectCoreBrowserGlobalViolations(browserScan);
  return violations;
}

/**
 * Scan the browser entrypoint using the gate's shared source and scope defaults.
 * @type {(deps: CoreBrowserMainDeps) => BrowserGlobalViolation[]}
 */
export const findCoreBrowserMainGlobalViolations = scanBrowserMainPolicy.bind(
  null,
  {
    sourceRoot: DEFAULT_SOURCE_ROOT,
    scopeAnalysisDeps: DEFAULT_SCOPE_ANALYSIS_DEPS,
    allowedGlobals: CORE_GLOBALS,
  }
);

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
 * Normalize injected dependencies and repository paths.
 * @param {Partial<DepcruiseGateDeps>} [options] Optional dependencies.
 * @returns {DepcruiseGateDeps} Normalized gate dependencies.
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
    pathModule:
      /** @type {{ join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string }} */ (
        requirePathModule(options.pathModule)
      ),
    scopeAnalysisDeps: options.scopeAnalysisDeps ?? DEFAULT_SCOPE_ANALYSIS_DEPS,
  };
}

/**
 * Execute dependency-cruiser and the core random policy scan.
 * @param {DepcruiseGateDeps} deps Gate dependencies.
 * @returns {{exitCode: number, violations: number}} Gate result.
 */
function executeDepcruiseGate(deps) {
  const { launchFailure } = gateUtils.runGateCommand({
    spawnImpl: deps.spawnImpl,
    command: 'depcruise',
    args: ['--config', deps.configPath, 'src'],
    rootDir: deps.rootDir,
    stderr: deps.stderr,
    launchLabel: 'Dependency-cruiser gate',
    commandLabel: 'depcruise',
  });

  if (launchFailure) {
    return { exitCode: launchFailure.exitCode, violations: 0 };
  }

  /** @type {CoreFileScanDeps} */
  const sharedScanDeps = deps;
  /** @type {CoreBrowserMainDeps & { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, scopeAnalysisDeps: { parseSourceForScopeAnalysis: (source: string) => unknown, analyzeScope: (ast: unknown) => { scopes: Array<{ through: Array<{ identifier?: { name?: string } }> }> } } }} */
  const browserScanDeps = {
    ...sharedScanDeps,
    scopeAnalysisDeps: deps.scopeAnalysisDeps,
  };

  const violations = findCoreMathRandomViolations(sharedScanDeps);
  const browserGlobalViolations =
    collectCoreBrowserGlobalViolations(browserScanDeps);

  if (browserGlobalViolations.length > 0) {
    reportViolations({
      stderr: deps.stderr,
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
      stderr: deps.stderr,
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

  gateUtils.writeGateSuccess(
    deps.stdout,
    'Checked dependency-cruiser: no core global dependencies.'
  );
  return gateUtils.createSuccessfulGateResult();
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
 *   scanSource: (source: string) => number,
 *   createViolation: (filePath: string, scanResult: number) => MathRandomViolation,
 * }} deps Scan dependencies.
 * @returns {MathRandomViolation[]} Violations discovered in source files.
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
  return gateUtils
    .walkJavaScriptFiles(sourceRootPath, readdirSync, pathModule)
    .flatMap(filePath => {
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
    });
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

  gateUtils
    .walkJavaScriptFiles(sourceRootPath, readdirSync, pathModule)
    .forEach(filePath => {
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
 * @param {(source: string) => number} scanSource Source scanner.
 * @param {(filePath: string, scanResult: number) => MathRandomViolation} createViolation Violation builder.
 * @returns {MathRandomViolation[]} Violations discovered in source files.
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
 * @template {Violation} T
 * @param {{
 *   stderr: { write: (text: string) => void },
 *   violations: T[],
 *   countLabel: string,
 *   describeViolation: (violation: T) => string,
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
  if (identifier === 'fetch') {
    return hasFetchUsageAtIndex(source, index);
  }
  return (
    CORE_GLOBALS.includes(identifier) &&
    hasBareGlobalUsageAtIndex(source, index, identifier)
  );
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
 * @param {RegExp | ((character: string | undefined) => boolean)} upperBoundaryTest Boundary test.
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

  const hasUpperBoundary =
    upperBoundaryTest instanceof RegExp
      ? upperBoundaryTest.test(nextCharacter ?? '')
      : upperBoundaryTest(nextCharacter);

  return hasLowerBoundary && hasUpperBoundary;
}

/**
 * Detect comment or string boundaries at the current index.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string } | null} Scan result when a boundary is found.
 */
function scanCodeForCommentOrString(source, index) {
  const boundary =
    CODE_BOUNDARIES[source.slice(index, index + 2)] ||
    CODE_BOUNDARIES[source[index]];
  return boundary
    ? createZeroCountScanResult(index + boundary.width, boundary.state)
    : null;
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
