import { reportFailuresAndMaybeLogSuccess } from '../commonCore.js';
import { useDefaultValue } from './gate-utils.js';
import { readExemptions } from './read-exemptions.js';

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
  /(?:^|\/)(?:index|main)\.js$|(?:^|\/)(?:browser|cloud|local|scripts|build)\/|(?:^|\/)parse[^/]*\.js$/;
const VALIDATION_HELPER_NAME_PATTERN =
  /(?:^|[^A-Za-z0-9_])(validate|isValid|assert|ensure)[A-Z0-9_]/;
const RAW_INPUT_PATTERNS = [
  {
    label: 'request.body access',
    pattern: /\brequest\.body\b|\breq\.body\b|\bctx\.body\b/,
  },
  { label: 'event.body access', pattern: /\bevent\.body\b/ },
  { label: 'event.data access', pattern: /\bevent\.data\b/ },
  {
    label: 'process.env access',
    pattern: /\bprocess\.env\.[A-Za-z_$][A-Za-z0-9_$]*/,
  },
  {
    label: 'localStorage access',
    pattern: /\blocalStorage\.(?:getItem|setItem|removeItem|clear)\s*\(/,
  },
  { label: 'URLSearchParams', pattern: /new\s+URLSearchParams\s*\(/ },
  {
    label: 'JSON.parse on raw input',
    pattern:
      /JSON\.parse\s*\(\s*(?:raw|input|payload|event(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|request(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|body|data|params)\b/,
  },
  {
    label: 'raw in-check',
    pattern:
      /(?:raw|input|payload|event|request|body|data|params)\s+in\s+[A-Za-z_$][A-Za-z0-9_$]*/,
  },
  {
    label: 'raw typeof check',
    pattern:
      /typeof\s+(?:raw|input|payload|event(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|request(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|body|data|params)\b/,
  },
  {
    label: 'raw Array.isArray check',
    pattern:
      /Array\.isArray\s*\(\s*(?:raw|input|payload|event(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|request(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*|body|data|params)\b/,
  },
];

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
 * @param {string} source Source text.
 * @returns {string[]} Helper names found in the source.
 */
function extractValidationHelperNames(source) {
  const names = [];
  const regex =
    /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*|(?:validate|isValid|assert|ensure)[A-Z0-9_$][A-Za-z0-9_$]*)|(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*|(?:validate|isValid|assert|ensure)[A-Z0-9_$][A-Za-z0-9_$]*)\s*=/g;
  let match;
  while ((match = regex.exec(source))) {
    const name = match[1] || match[2];
    if (VALIDATION_HELPER_NAME_PATTERN.test(name)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * @param {string} source Source text.
 * @returns {Array<{ label: string }>} Raw-input interpretation markers.
 */
function extractRawInputMarkers(source) {
  return RAW_INPUT_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(
    ({ label }) => ({
      label,
    })
  );
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
 * @param {{ filePath: string, label: string }[]} violations Violations to render.
 * @returns {string[]} Human-readable failure lines.
 */
function formatRawInputFailures(violations) {
  return violations.map(
    ({ filePath, label }) =>
      `${filePath} contains raw-input interpretation (${label}); keep boundary parsing out of core.`
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
  return findViolationsInCore(deps, source =>
    extractValidationHelperNames(source).map(name => ({ name }))
  );
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
 * @returns {Array<{ filePath: string, label: string }>} Raw-input violations.
 */
function findRawInputViolations(deps) {
  return findViolationsInCore(deps, source => extractRawInputMarkers(source));
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
