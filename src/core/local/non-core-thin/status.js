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
 * }} non-core thin status for the current repo snapshot
 */
export function getNonCoreThinStatus() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const maxLines = config.maxLines;
  const exemptions = new Set(Object.keys(config.exemptions));
  const files = listJsFiles(SRC_DIR);
  const fileSet = new Set(files);
  const staleExemptions = [...exemptions].filter(
    filePath => !fileSet.has(filePath)
  );
  const violations = files
    .map(filePath => ({ filePath, lines: countLines(filePath) }))
    .filter(
      ({ filePath, lines }) => lines > maxLines && !exemptions.has(filePath)
    );

  return {
    isClean: staleExemptions.length === 0 && violations.length === 0,
    maxLines,
    fileCount: files.length,
    exemptionCount: exemptions.size,
    staleExemptions,
    violations,
  };
}

/**
 * List non-core JavaScript files under `dir`.
 * @param {string} dir directory to scan
 * @returns {string[]} repo-relative JavaScript paths outside `src/core`
 */
function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return collectJsFiles(entry, fullPath);
  });
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
 * Handle a directory entry during the scan.
 * @param {import('node:fs').Dirent} entry directory entry
 * @param {string} fullPath absolute path for the entry
 * @returns {string[]} discovered repo-relative JavaScript files
 */
function collectJsFiles(entry, fullPath) {
  if (entry.isDirectory()) {
    return shouldSkipDirectory(fullPath) ? [] : listJsFiles(fullPath);
  }
  return collectJsFile(entry, fullPath);
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
 * Collect a non-directory file if it is a JavaScript file.
 * @param {import('node:fs').Dirent} entry directory entry
 * @param {string} fullPath absolute path for the entry
 * @returns {string[]} discovered repo-relative JavaScript files
 */
function collectJsFile(entry, fullPath) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) {
    return [];
  }
  return [toRepoPath(fullPath)];
}
