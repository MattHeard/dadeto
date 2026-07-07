import { execFileSync } from 'node:child_process';
import { reportFailuresAndMaybeLogSuccess } from '../commonCore.js';
import { useDefaultValue } from './gate-utils.js';
import { readExemptions } from './read-exemptions.js';
import { pathToFileURL } from 'node:url';

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
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
 * @param {...string} segments Path segments.
 * @returns {string} Joined path.
 */
function joinPath(...segments) {
  return segments.join('/');
}

/**
 * @param {{
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
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   stdout: { log: (line: string) => void, error: (line: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} Normalized options.
 */
function normalizeOptions(options = {}) {
  return {
    fsModule: useDefaultValue(options.fsModule, DEFAULT_FS_MODULE),
    pathModule: useDefaultValue(options.pathModule, DEFAULT_PATH_MODULE),
    stdout: useDefaultValue(options.stdout, DEFAULT_STDOUT),
    rootDir: useDefaultValue(options.rootDir, DEFAULT_ROOT_DIR),
    sourceRoot: useDefaultValue(options.sourceRoot, DEFAULT_SOURCE_ROOT),
    configPath: useDefaultValue(options.configPath, DEFAULT_CONFIG_PATH),
  };
}

/**
 * @param {{
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: { resolve: (...segments: string[]) => string },
 *   rootDir: string,
 *   configPath: string,
 * }} deps Parse-gate filesystem dependencies.
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
 * @param {string} sourceRoot Source tree path relative to the root.
 * @param {{
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   rootDir: string,
 * }} deps Directory scan dependencies.
 * @returns {string[]} Repo-relative JavaScript files under src/core.
 */
function listJsFiles(rootDir, sourceRoot, deps) {
  const baseDir = deps.pathModule.resolve(rootDir, sourceRoot);
  return walk(baseDir, deps).map(filePath =>
    filePath.replaceAll(deps.pathModule.sep, '/')
  );
}

/**
 * @param {string} dirPath Directory path to scan.
 * @param {{
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (from: string, to: string) => string, sep: string },
 *   rootDir: string,
 * }} deps Scan dependencies.
 * @returns {string[]} Repo-relative JavaScript files discovered under the directory.
 */
function walk(dirPath, deps) {
  const entries = deps.fsModule.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = deps.pathModule.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath, deps);
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      return [deps.pathModule.relative(deps.rootDir, fullPath)];
    }
    return [];
  });
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
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} deps Parse gate dependencies.
 * @param {(source: string) => T[]} extractViolationsFromSource Source extractor.
 * @returns {Array<{ filePath: string } & T>} Violations.
 */
function findViolationsInCore(deps, extractViolationsFromSource) {
  const exemptions = readExemptionsFromFsModule(deps);
  return listJsFiles(deps.rootDir, deps.sourceRoot, deps).flatMap(filePath => {
    if (BOUNDARY_FILE_PATTERN.test(filePath) || exemptions.has(filePath)) {
      return [];
    }

    const source = deps.fsModule.readFileSync(
      deps.pathModule.resolve(deps.rootDir, filePath),
      'utf8'
    );
    return extractViolationsFromSource(source).map(violation => ({
      filePath,
      ...violation,
    }));
  });
}

/**
 * @param {{
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} deps Parse-validate gate dependencies.
 * @returns {Array<{ filePath: string, name: string }>} Validation helper violations.
 */
function findValidationViolations(deps) {
  return findClassifierViolations(deps, isValidatorOnlyFunction);
}

/**
 * @param {{
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} deps Parse-boundary gate dependencies.
 * @returns {Array<{ filePath: string, name: string }>} Raw-input violations.
 */
function findRawInputViolations(deps) {
  return findClassifierViolations(deps, isParserFunction);
}

/**
 * @param {{
 *   fsModule: { readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>, readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} deps Parse gate dependencies.
 * @param {(fn: { name: string, labels: string[] }) => boolean} predicate Function classifier predicate.
 * @returns {Array<{ filePath: string, name: string }>} Violations.
 */
function findClassifierViolations(deps, predicate) {
  return findViolationsInCore(deps, source => {
    const functions = classifyCoreFunctions(deps, source);
    return functions.filter(predicate).map(fn => ({ name: fn.name }));
  });
}

/**
 * @param {{ name: string, labels: string[] }} fn Classified function.
 * @returns {boolean} True when the function is validator-only.
 */
function isValidatorOnlyFunction(fn) {
  return fn.labels.includes('validator') && !fn.labels.includes('parser');
}

/**
 * @param {{ name: string, labels: string[] }} fn Classified function.
 * @returns {boolean} True when the function is parser-labeled.
 */
function isParserFunction(fn) {
  return fn.labels.includes('parser');
}

/**
 * @param {{
 *   pathModule: { resolve: (...segments: string[]) => string },
 * }} deps Classifier dependencies.
 * @param {string} _source File source.
 * @returns {Array<{ name: string, labels: string[] }>} Classified functions.
 */
function classifyCoreFunctions(deps, _source) {
  const classifierPath = deps.pathModule.resolve(
    process.cwd(),
    'classify-functions.js'
  );
  const classifierUrl = pathToFileURL(classifierPath).href;
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { classifyFunctionsFromSource } from ${JSON.stringify(classifierUrl)};\nlet source = '';\nprocess.stdin.setEncoding('utf8');\nprocess.stdin.on('data', chunk => { source += chunk; });\nprocess.stdin.on('end', () => {\n  process.stdout.write(JSON.stringify({ functions: classifyFunctionsFromSource(source) }));\n});`,
    ],
    {
      encoding: 'utf8',
      input: _source,
    }
  );
  return JSON.parse(output).functions;
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
  return function createHandle(options = {}) {
    const deps = normalizeOptions(options);
    return function handle() {
      const violations = findViolations(deps);
      if (
        reportFailuresAndMaybeLogSuccess({
          failures: formatFailures(violations),
          output: deps.stdout,
          setExitCode() {},
          successMessage,
        })
      ) {
        return { exitCode: 1, violations };
      }

      return { exitCode: 0, violations };
    };
  };
}

const createParseNotValidateHandle = createGateRunner({
  successMessage:
    'Checked parse-not-validate in src/core; no validation helpers found outside boundaries.',
  findViolations: findValidationViolations,
  formatFailures: formatValidationFailures,
});

const createParseBoundaryHandle = createGateRunner({
  successMessage:
    'Checked parse-boundary in src/core; no raw-input interpretation found outside boundaries.',
  findViolations: findRawInputViolations,
  formatFailures: formatRawInputFailures,
});

/**
 * Backward-compatible aggregate gate for the existing `core-parse` script.
 * @param {{
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
 * }} options Gate dependencies.
 * @returns {() => { exitCode: number, violations: Array<{ filePath: string, name?: string, label?: string }> }} Aggregate gate handler.
 */
export function createCheckCoreParseHandle(options = {}) {
  const validationHandle = createParseNotValidateHandle(options);
  const boundaryHandle = createParseBoundaryHandle(options);
  return function handleCoreParseGate() {
    const validationResult = validationHandle();
    const boundaryResult = boundaryHandle();
    const violations = [
      ...validationResult.violations,
      ...boundaryResult.violations,
    ];

    if (validationResult.exitCode || boundaryResult.exitCode) {
      return { exitCode: 1, violations };
    }

    return { exitCode: 0, violations };
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
