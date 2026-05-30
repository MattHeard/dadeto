import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = path.resolve('non-core-thin-exemptions.json');
const SRC_DIR = path.resolve('src');
const REPO_ROOT = path.resolve('.');

/**
 * Read the current non-core thin status.
 * @returns {{
 *   isClean: boolean,
 *   maxLines: number,
 *   fileCount: number,
 *   exemptionCount: number,
 *   staleExemptions: string[],
 *   violations: Array<{ filePath: string, lines: number }>,
 *   patternViolations: Array<{ filePath: string, reason: string }>,
 * }} non-core thin status for the current repo snapshot
 */
export function getNonCoreThinStatus() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return buildNonCoreThinStatus(config, listJsFiles(SRC_DIR));
}

/**
 * Format the failure output for the non-core thin gate.
 * @param {{
 *   fileCount: number,
 *   staleExemptions: string[],
 *   violations: Array<{ filePath: string, lines: number }>,
 *   patternViolations: Array<{ filePath: string, reason: string }>,
 *   maxLines: number,
 * }} status Non-core thin status snapshot.
 * @returns {string[]} stderr lines for a failing run
 */
export function formatNonCoreThinFailure(status) {
  const lines = [];

  status.staleExemptions.forEach(filePath => {
    lines.push(`Stale non-core thin exemption: ${filePath}`);
  });

  status.violations.forEach(({ filePath, lines: lineCount }) => {
    lines.push(
      `${filePath} has ${lineCount} lines; max non-core size is ${status.maxLines}.`
    );
  });

  status.patternViolations.forEach(({ filePath, reason }) => {
    lines.push(`${filePath} does not match non-core wrapper shape: ${reason}`);
  });

  const violationWord = pluralize(status.violations.length, 'violation');
  const patternViolationWord = pluralize(
    status.patternViolations.length,
    'wrapper violation'
  );
  const exemptionWord = pluralize(
    status.staleExemptions.length,
    'stale exemption'
  );
  const fileWord = pluralize(status.fileCount, 'file');

  lines.push(
    `Non-core thin check found ${status.violations.length} ${violationWord}, ${status.patternViolations.length} ${patternViolationWord}, and ${status.staleExemptions.length} ${exemptionWord} across ${status.fileCount} ${fileWord}.`
  );

  return lines;
}

/**
 * Build the non-core thin status from a config snapshot and file list.
 * @param {{ maxLines: number, exemptions: Record<string, string> }} config Status config.
 * @param {string[]} files Repo-relative JavaScript files outside `src/core`.
 * @returns {{
 *   isClean: boolean,
 *   maxLines: number,
 *   fileCount: number,
 *   exemptionCount: number,
 *   staleExemptions: string[],
 *   violations: Array<{ filePath: string, lines: number }>,
 *   patternViolations: Array<{ filePath: string, reason: string }>,
 * }} non-core thin status for the current repo snapshot
 */
function buildNonCoreThinStatus(config, files) {
  const maxLines = config.maxLines;
  const exemptions = new Set(Object.keys(config.exemptions));
  const fileSet = new Set(files);
  const staleExemptions = [...exemptions].filter(
    filePath => !fileSet.has(filePath)
  );
  const violations = files
    .map(filePath => ({ filePath, lines: countLines(filePath) }))
    .filter(
      ({ filePath, lines }) => lines > maxLines && !exemptions.has(filePath)
    );
  const patternViolations = files.flatMap(filePath =>
    getWrapperPatternViolations(filePath, exemptions)
  );

  return {
    isClean:
      staleExemptions.length === 0 &&
      violations.length === 0 &&
      patternViolations.length === 0,
    maxLines,
    fileCount: files.length,
    exemptionCount: exemptions.size,
    staleExemptions,
    violations,
    patternViolations,
  };
}

/**
 * List non-core JavaScript files under `dir`.
 * @param {string} dir directory to scan
 * @returns {string[]} repo-relative JavaScript paths outside `src/core`
 */
function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const directories = entries.filter(entry =>
    shouldIncludeDirectory(dir, entry)
  );
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .map(entry => toRepoPath(path.join(dir, entry.name)));

  return [
    ...directories.flatMap(entry => listJsFiles(path.join(dir, entry.name))),
    ...files,
  ];
}

/**
 * Count lines in a file.
 * @param {string} filePath repo-relative file path
 * @returns {number} total number of lines in the file
 */
function countLines(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8').split('\n').length;
}

/**
 * Convert an absolute path into a repo-relative path.
 * @param {string} filePath absolute file path
 * @returns {string} repo-relative path using forward slashes
 */
function toRepoPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
}

/**
 * Tell whether a directory should be skipped during the scan.
 * @param {string} fullPath absolute path for the entry
 * @returns {boolean} true when the directory is `src/core`
 */
function shouldSkipDirectory(fullPath) {
  return fullPath === path.join(SRC_DIR, 'core');
}

/**
 * Tell whether a directory entry should be scanned.
 * @param {string} dir directory being scanned
 * @param {import('node:fs').Dirent} entry directory entry
 * @returns {boolean} true when the entry is a non-core directory
 */
function shouldIncludeDirectory(dir, entry) {
  return (
    entry.isDirectory() && !shouldSkipDirectory(path.join(dir, entry.name))
  );
}

export const nonCoreThinStatusTestOnly = {
  buildNonCoreThinStatus,
  formatNonCoreThinFailure,
  getWrapperPatternViolations,
  getWrapperPatternViolationsForSource,
};

/**
 * Select the singular or plural form for a noun based on a count.
 * @param {number} count Count of items.
 * @param {string} singular Singular noun phrase.
 * @returns {string} Singular phrase when count is one, otherwise pluralized phrase.
 */
function pluralize(count, singular) {
  if (count === 1) {
    return singular;
  }

  return `${singular}s`;
}

/**
 * Check whether a non-core file follows the dependency-only wrapper shape.
 * @param {string} filePath Repo-relative file path.
 * @param {Set<string>} exemptions Explicitly exempted file paths.
 * @returns {Array<{ filePath: string, reason: string }>} Wrapper shape violations.
 */
function getWrapperPatternViolations(filePath, exemptions) {
  if (exemptions.has(filePath) || !shouldEnforceWrapperPattern(filePath)) {
    return [];
  }

  const source = fs.readFileSync(path.resolve(filePath), 'utf8');
  return getWrapperPatternViolationsForSource(filePath, source);
}

/**
 * Check whether source follows the dependency-only wrapper shape.
 * @param {string} filePath Repo-relative file path.
 * @param {string} source JavaScript source text.
 * @returns {Array<{ filePath: string, reason: string }>} Wrapper shape violations.
 */
function getWrapperPatternViolationsForSource(filePath, source) {
  const hasHandleDeclaration =
    /\bconst\s+handle\s*=\s*[A-Za-z_$][\w$]*\s*\(/u.test(source);
  if (!hasHandleDeclaration) {
    return [
      {
        filePath,
        reason:
          'expected `const handle = coreFactory(...)` in this non-core wrapper',
      },
    ];
  }

  const exportsHandle =
    /\bexport\s*\{\s*handle\s*\}/u.test(source) ||
    /\bexport\s+const\s+handle\s*=/u.test(source);
  const invokesHandle = /(?:^|[^\w$])(?:await\s+)?handle\s*\(/u.test(source);
  if (!exportsHandle && !invokesHandle) {
    return [
      {
        filePath,
        reason: 'expected the declared `handle` to be exported or invoked',
      },
    ];
  }

  return [];
}

/**
 * Tell whether the wrapper-shape policy applies to a file.
 * @param {string} filePath Repo-relative file path.
 * @returns {boolean} True when the file must declare/export-or-run handle.
 */
function shouldEnforceWrapperPattern(filePath) {
  if (filePath.startsWith('src/cloud/')) {
    return filePath.endsWith('/index.js');
  }

  return ['src/browser/', 'src/build/', 'src/local/', 'src/scripts/'].some(
    prefix => filePath.startsWith(prefix)
  );
}
