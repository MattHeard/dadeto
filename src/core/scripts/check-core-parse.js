import { reportFailuresAndMaybeLogSuccess } from '../commonCore.js';
import { useDefaultValue, walkJavaScriptFiles } from './gate-utils.js';
import { readExemptions } from './read-exemptions.js';
import { LOGIC_SOURCE_ROOTS } from '../../logic/core/local/logic-source-paths.js';

/** @typedef {{label: string, kind: string}} ClassificationSignal */
/** @typedef {{ name: string, labels: string[], signals?: ClassificationSignal[] }} ClassifiedFunction */
/** @typedef {(source: string) => ClassifiedFunction[]} ClassifySource */

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
const TRUSTED_LOGIC_ROOT = 'src/logic/core/';
const BOUNDARY_LOGIC_ROOT = 'src/logic/boundary/';
const RAW_INPUT_SIGNALS = new Set([
  'primitive_parse',
  'date_parse',
  'schema_parse',
]);
const DEFAULT_CONFIG_PATH = 'core-parse-exemptions.json';
const DEFAULT_STDOUT = { log() {}, error() {} };
/**
 * @type {{
 *   join: (...segments: string[]) => string,
 *   resolve: (...segments: string[]) => string,
 *   relative: (from: string, to: string) => string,
 *   sep: string,
  }} */
const DEFAULT_PATH_MODULE = {
  join: joinPath,
  resolve: joinPath,
  relative: (_from, to) => to,
  sep: '/',
};
const DEFAULT_FS_MODULE = {
  readdirSync() {
    return [];
  },
  readFileSync() {
    return '';
  },
};

const BOUNDARY_FILE_PATTERN =
  /(?:^|\/)(?:index|main)\.js$|(?:^|\/)(?:browser|cloud|local|scripts|build)\//;

/**
 * Fail when the inert legacy defaults are used for actual classification.
 * @returns {never} Missing required classifier programming error.
 */
function missingClassifier() {
  throw new TypeError('classifySource must be provided');
}

/**
 * @param {...string} segments Path segments.
 * @returns {string} Joined path.
 */
function joinPath(...segments) {
  return segments.join('/');
}

/**
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule?: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   stdout?: { log: (line: string) => void, error: (line: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 * }} [options] Gate dependencies.
 * @returns {{
 *   classifySource: ClassifySource,
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   stdout: { log: (line: string) => void, error: (line: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   sourceRoots: Array<{path: string, optional: boolean}>,
 *   configPath: string,
 * }} Normalized options.
 */
function normalizeOptions(options = { classifySource: missingClassifier }) {
  return {
    classifySource: options.classifySource,
    fsModule: useDefaultValue(options.fsModule, DEFAULT_FS_MODULE),
    pathModule: useDefaultValue(options.pathModule, DEFAULT_PATH_MODULE),
    stdout: useDefaultValue(options.stdout, DEFAULT_STDOUT),
    rootDir: useDefaultValue(options.rootDir, DEFAULT_ROOT_DIR),
    sourceRoot: useDefaultValue(options.sourceRoot, DEFAULT_SOURCE_ROOT),
    sourceRoots: selectSourceRoots(options.sourceRoot),
    configPath: useDefaultValue(options.configPath, DEFAULT_CONFIG_PATH),
  };
}

/**
 * Preserve an explicit single-root scan; future default roots may be absent.
 * @param {string | undefined} sourceRoot Explicit caller selection.
 * @returns {Array<{path: string, optional: boolean}>} Scan roots.
 */
function selectSourceRoots(sourceRoot) {
  if (sourceRoot !== undefined) return [{ path: sourceRoot, optional: false }];
  return LOGIC_SOURCE_ROOTS.map(path => ({
    path,
    optional: path !== DEFAULT_SOURCE_ROOT,
  }));
}

/**
 * @param {{ fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string }, pathModule: { resolve: (...segments: string[]) => string }, rootDir: string, configPath: string }} deps Parse-gate filesystem dependencies.
 * @returns {Set<string>} Exempted file paths.
 */
function readExemptionsFromFsModule(deps) {
  return readExemptions({
    readFileSync: deps.fsModule.readFileSync,
    rootDir: deps.rootDir,
    configPath: deps.configPath,
    pathModule: deps.pathModule,
  });
}

/**
 * @param {string} rootDir Repository root path.
 * @param {{path: string, optional: boolean}} sourceRoot Source tree selection.
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   rootDir: string,
 * }} deps Directory scan dependencies.
 * @returns {string[]} Repo-relative JavaScript files under src/core.
 */
function listJsFiles(rootDir, sourceRoot, deps) {
  const baseDir = deps.pathModule.resolve(rootDir, sourceRoot.path);
  return walk(baseDir, deps, sourceRoot.optional).map(filePath =>
    filePath.replaceAll(deps.pathModule.sep, '/')
  );
}

/**
 * @param {string} dirPath Directory path to scan.
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   rootDir: string,
 * }} deps Scan dependencies.
 * @param {boolean} optional Whether the root may be absent.
 * @returns {string[]} Repo-relative JavaScript files discovered under the directory.
 */
function walk(dirPath, deps, optional) {
  return walkJavaScriptFiles(
    dirPath,
    (dir, options) =>
      readScanDirectory(dir, options, {
        baseDir: dirPath,
        optional,
        fsModule: deps.fsModule,
      }),
    deps.pathModule,
    fullPath => deps.pathModule.relative(deps.rootDir, fullPath)
  );
}

/**
 * Only absence of an optional scan root is benign; nested failures propagate.
 * @param {string} directory Requested directory.
 * @param {{withFileTypes: true}} options Directory-entry options.
 * @param {{baseDir: string, optional: boolean, fsModule: Pick<ReturnType<typeof normalizeOptions>['fsModule'], 'readdirSync'>}} scan Scan dependencies.
 * @returns {Array<{isDirectory: () => boolean, isFile: () => boolean, name: string}>} Entries.
 */
function readScanDirectory(directory, options, scan) {
  try {
    return scan.fsModule.readdirSync(directory, options);
  } catch (error) {
    if (
      scan.optional &&
      directory === scan.baseDir &&
      isMissingDirectory(error)
    ) {
      return [];
    }
    throw error;
  }
}

/**
 * @param {unknown} error Filesystem failure.
 * @returns {boolean} Whether the directory is absent.
 */
function isMissingDirectory(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

/**
 * @param {{ filePath: string, name: string }[]} violations Violations to render.
 * @returns {string[]} Human-readable failure lines.
 */
function formatValidationFailures(violations) {
  return violations.map(
    ({ filePath, name }) =>
      `${filePath} contains validation helper ${name}; parse values instead of gatekeeping them.`
  );
}

/**
 * @param {{ filePath: string, name: string }[]} violations Violations to render.
 * @returns {string[]} Human-readable failure lines.
 */
function formatRawInputFailures(violations) {
  return violations.map(
    ({ filePath, name }) =>
      `${filePath} contains parser function ${name}; keep parse logic in boundary modules.`
  );
}

/**
 * @template T
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   sourceRoots: Array<{path: string, optional: boolean}>,
 *   configPath: string,
 * }} deps Parse gate dependencies.
 * @param {(source: string, filePath: string) => T[]} extractViolationsFromSource Source extractor.
 * @param {(filePath: string) => boolean} isAllowedBoundary Applicable boundary policy.
 * @returns {Array<{ filePath: string } & T>} Violations.
 */
function findViolationsInCore(
  deps,
  extractViolationsFromSource,
  isAllowedBoundary
) {
  const exemptions = readExemptionsFromFsModule(deps);
  const fileViolations = [];
  const files = deps.sourceRoots.flatMap(root =>
    listJsFiles(deps.rootDir, root, deps)
  );
  for (const filePath of files) {
    if (isAllowedBoundary(filePath) || exemptions.has(filePath)) {
      continue;
    }
    const source = deps.fsModule.readFileSync(
      deps.pathModule.resolve(deps.rootDir, filePath),
      'utf8'
    );
    for (const violation of extractViolationsFromSource(source, filePath)) {
      fileViolations.push({ filePath, ...violation });
    }
  }
  return fileViolations;
}

/**
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   sourceRoots: Array<{path: string, optional: boolean}>,
 *   configPath: string,
 * }} deps Parse-validate gate dependencies.
 * @returns {Array<{ filePath: string, name: string }>} Validation helper violations.
 */
function findValidationViolations(deps) {
  return findClassifierViolations(
    deps,
    isValidatorOnlyFunction,
    isLegacyBoundaryFile
  );
}

/**
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   sourceRoots: Array<{path: string, optional: boolean}>,
 *   configPath: string,
 * }} deps Parse-boundary gate dependencies.
 * @returns {Array<{ filePath: string, name: string }>} Raw-input violations.
 */
function findRawInputViolations(deps) {
  return findClassifierViolations(
    deps,
    isRawInputFunction,
    isParserBoundaryFile
  );
}

/**
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   sourceRoots: Array<{path: string, optional: boolean}>,
 *   configPath: string,
 * }} deps Parse gate dependencies.
 * @param {(fn: ClassifiedFunction, filePath: string) => boolean} predicate Function classifier predicate.
 * @param {(filePath: string) => boolean} isAllowedBoundary Applicable boundary policy.
 * @returns {Array<{ filePath: string, name: string }>} Violations.
 */
function findClassifierViolations(deps, predicate, isAllowedBoundary) {
  return findViolationsInCore(
    deps,
    (source, filePath) => {
      const functions = deps.classifySource(source);
      return functions
        .filter(fn => predicate(fn, filePath))
        .map(fn => ({ name: fn.name }));
    },
    isAllowedBoundary
  );
}

/**
 * @param {string} filePath Normalized repository-relative file.
 * @returns {boolean} Whether it belongs to either destination namespace.
 */
function isDestinationLogicFile(filePath) {
  return (
    filePath.startsWith(TRUSTED_LOGIC_ROOT) ||
    filePath.startsWith(BOUNDARY_LOGIC_ROOT)
  );
}

/**
 * @param {string} filePath Normalized repository-relative file.
 * @returns {boolean} Whether legacy integration-path exemptions apply.
 */
function isLegacyBoundaryFile(filePath) {
  if (isDestinationLogicFile(filePath)) return false;
  return BOUNDARY_FILE_PATTERN.test(filePath);
}

/**
 * @param {string} filePath Normalized repository-relative file.
 * @returns {boolean} Whether raw-input parsing belongs here.
 */
function isParserBoundaryFile(filePath) {
  return (
    filePath.startsWith(BOUNDARY_LOGIC_ROOT) || isLegacyBoundaryFile(filePath)
  );
}

/**
 * @param {ClassifiedFunction} fn Classified function.
 * @param {string} filePath Normalized repository-relative file.
 * @returns {boolean} True when the function is validator-only.
 */
function isValidatorOnlyFunction(fn, filePath) {
  if (isDestinationLogicFile(filePath) && fn.signals) {
    return isDestinationValidation(fn, filePath, fn.signals);
  }
  return fn.labels.includes('validator') && !isParserFunction(fn);
}

/**
 * Core construction cannot conceal validation; boundary construction may parse.
 * @param {ClassifiedFunction} fn Complete classification.
 * @param {string} filePath Normalized repository-relative file.
 * @param {ClassificationSignal[]} signals Observed AST signals.
 * @returns {boolean} Whether validation-only logic violates the namespace.
 */
function isDestinationValidation(fn, filePath, signals) {
  if (filePath.startsWith(BOUNDARY_LOGIC_ROOT) && isParserFunction(fn))
    return false;
  return signals.some(
    signal => signal.label === 'validator' && signal.kind !== 'comparison_guard'
  );
}

/**
 * Generic construction signals are domain computation, not proof of raw input.
 * @param {ClassifiedFunction} fn Classified function.
 * @param {string} filePath Normalized repository-relative file.
 * @returns {boolean} Whether raw-input parsing is present.
 */
function isRawInputFunction(fn, filePath) {
  if (isDestinationLogicFile(filePath) && fn.signals) {
    return fn.signals.some(
      signal => signal.label === 'parser' && RAW_INPUT_SIGNALS.has(signal.kind)
    );
  }
  return isParserFunction(fn);
}

/**
 * @param {{ name: string, labels: string[] }} fn Classified function.
 * @returns {boolean} True when the function is parser-labeled.
 */
function isParserFunction(fn) {
  return fn.labels.includes('parser');
}

/**
 * @template {Record<string, unknown>} T
 * @param {{
 *   successMessage: string,
 *   findViolations: (deps: ReturnType<typeof normalizeOptions>) => Array<T>,
 *   formatFailures: (violations: Array<T>) => string[],
 * }} config Gate factory configuration.
 * @returns {(options?: Parameters<typeof normalizeOptions>[0]) => () => { exitCode: number, violations: Array<T> }} Gate builder.
 */
function createGateRunner({ successMessage, findViolations, formatFailures }) {
  /**
   * @param {Parameters<typeof normalizeOptions>[0]} [options] Gate dependencies.
   * @returns {() => {exitCode: number, violations: Array<T>}} Bound gate.
   */
  return function createHandle(options) {
    const deps = normalizeOptions(options);
    return function handle() {
      const violations = findViolations(deps);
      const failed = reportFailuresAndMaybeLogSuccess({
        failures: formatFailures(violations),
        output: deps.stdout,
        setExitCode() {},
        successMessage,
      });
      return { exitCode: failed ? 1 : 0, violations };
    };
  };
}

const createParseNotValidateHandle = createGateRunner({
  successMessage:
    'Checked parse-not-validate across configured source roots; no validator-only helpers found.',
  findViolations: findValidationViolations,
  formatFailures: formatValidationFailures,
});

const createParseBoundaryHandle = createGateRunner({
  successMessage:
    'Checked parse-boundary across configured source roots; no raw-input interpretation found outside parser boundaries.',
  findViolations: findRawInputViolations,
  formatFailures: formatRawInputFailures,
});

/**
 * Backward-compatible aggregate gate for the existing `core-parse` script.
 * @param {{
 *   classifySource: ClassifySource,
 *   fsModule?: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule?: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   stdout?: { log: (line: string) => void, error: (line: string) => void },
 *   rootDir?: string,
 *   sourceRoot?: string,
 *   configPath?: string,
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, violations: Array<{ filePath: string, name?: string, label?: string }> }} Aggregate gate handler.
 */
export function createCheckCoreParseHandle(options) {
  const validationHandle = createParseNotValidateHandle(options);
  const boundaryHandle = createParseBoundaryHandle(options);
  return function handleCoreParseGate() {
    const validationResult = validationHandle();
    const boundaryResult = boundaryHandle();
    const violations = [
      ...validationResult.violations,
      ...boundaryResult.violations,
    ];

    return {
      exitCode: validationResult.exitCode || boundaryResult.exitCode ? 1 : 0,
      violations,
    };
  };
}

export const checkCoreParseTestUtils = {
  normalizeOptions,
  readExemptions: readExemptionsFromFsModule,
  defaultPathModule: DEFAULT_PATH_MODULE,
  findValidationViolations,
  findRawInputViolations,
};

export const createCheckParseNotValidateHandle = createParseNotValidateHandle;
export const createCheckParseBoundaryHandle = createParseBoundaryHandle;
