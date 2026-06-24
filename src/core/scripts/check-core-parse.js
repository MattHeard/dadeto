import { reportFailuresAndMaybeLogSuccess } from '../commonCore.js';
import { useDefaultValue } from './gate-utils.js';

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
const DEFAULT_CONFIG_PATH = 'core-parse-exemptions.json';
const DEFAULT_STDOUT = { log() {}, error() {} };
const DEFAULT_PATH_MODULE = {
  join: (...segments) => segments.join('/'),
  resolve: (...segments) => segments.join('/'),
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

const VALIDATION_NAME_PATTERN =
  /(?:^|[^A-Za-z0-9_])(validate|isValid|assert|ensure)[A-Z0-9_]/;
const BOUNDARY_FILE_PATTERN = /(?:^|\/)(?:index|main)\.js$/;

/**
 * Create the command handler that checks for parse-at-boundary discipline in src/core.
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
 * @returns {() => { exitCode: number, violations: Array<{ filePath: string, name: string }> }} Parse gate handler.
 */
export function createCheckCoreParseHandle(options = {}) {
  const deps = normalizeOptions(options);
  return function handleCoreParseGate() {
    const violations = findValidationViolations(deps);
    const successMessage = `Checked parse boundaries in ${deps.sourceRoot}; no downstream validation helpers found.`;

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
}

export const checkCoreParseTestUtils = {
  normalizeOptions,
  readExemptions,
  defaultPathModule: DEFAULT_PATH_MODULE,
};

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
 * }} options Gate options.
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
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: {
 *     join: (...segments: string[]) => string,
 *     resolve: (...segments: string[]) => string,
 *     relative: (from: string, to: string) => string,
 *     sep: string,
 *   },
 *   rootDir: string,
 *   sourceRoot: string,
 *   stdout: { log: (line: string) => void, error: (line: string) => void },
 *   configPath: string,
 * }} deps Parse gate dependencies.
 * @returns {Array<{ filePath: string, name: string }>} Validation helper violations.
 */
function findValidationViolations(deps) {
  const exemptions = readExemptions(deps);
  return listJsFiles(deps.rootDir, deps.sourceRoot, deps).flatMap(filePath => {
    if (BOUNDARY_FILE_PATTERN.test(filePath)) {
      return [];
    }

    if (exemptions.has(filePath)) {
      return [];
    }

    const source = deps.fsModule.readFileSync(
      deps.pathModule.resolve(deps.rootDir, filePath),
      'utf8'
    );
    return extractValidationNames(source).map(name => ({ filePath, name }));
  });
}

/**
 * @param {string} source Source text.
 * @returns {string[]} Validation helper names found in the source.
 */
function extractValidationNames(source) {
  const names = [];
  const regex =
    /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*|(?:validate|isValid|assert|ensure)[A-Z0-9_$][A-Za-z0-9_$]*)|(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*|(?:validate|isValid|assert|ensure)[A-Z0-9_$][A-Za-z0-9_$]*)\s*=/g;
  let match;
  while ((match = regex.exec(source))) {
    const name = match[1] || match[2];
    if (VALIDATION_NAME_PATTERN.test(name)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * @param {Array<{ filePath: string, name: string }>} violations Violations to render.
 * @returns {string[]} Human-readable failure lines.
 */
function formatFailures(violations) {
  return violations.map(
    ({ filePath, name }) =>
      `${filePath} contains downstream validation helper ${name}; parse at the boundary instead.`
  );
}

/**
 * @param {{
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string },
 *   pathModule: { resolve: (...segments: string[]) => string },
 *   rootDir: string,
 *   configPath: string,
 * }} deps Exemption-file dependencies.
 * @returns {Set<string>} Repo-relative files exempt from the baseline scan.
 */
/* istanbul ignore next */
function readExemptions(deps) {
  try {
    const raw = deps.fsModule.readFileSync(
      deps.pathModule.resolve(deps.rootDir, deps.configPath),
      'utf8'
    );
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return new Set();
    }

    const exemptions = parsed.exemptions || {};
    /* istanbul ignore next */
    return new Set(Object.keys(exemptions));
  } catch {
    return new Set();
  }
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
