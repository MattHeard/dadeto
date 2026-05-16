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
