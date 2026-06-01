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
 * Create the command handler for the non-core thin check.
 * @param {{
 *   getStatus: () => {
 *     isClean: boolean,
 *     fileCount: number,
 *     exemptionCount: number,
 *     maxLines: number,
 *   },
 *   formatFailure: (status: {
 *     isClean: boolean,
 *     fileCount: number,
 *     exemptionCount: number,
 *     maxLines: number,
 *   }) => string[],
 *   output: { error: (line: string) => void, log: (line: string) => void },
 *   setExitCode: (exitCode: number) => void,
 * }} deps Command dependencies.
 * @returns {() => void} Handler that runs the check and reports the outcome.
 */
export function createCheckNonCoreThinHandle({
  getStatus,
  formatFailure,
  output,
  setExitCode,
}) {
  return () => {
    const status = getStatus();

    if (!status.isClean) {
      formatFailure(status).forEach(line => {
        output.error(line);
      });
      setExitCode(1);
      return;
    }

    output.log(
      `Checked ${status.fileCount} non-core JS files; ${status.exemptionCount} baseline exemptions; max ${status.maxLines} lines.`
    );
  };
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
    getWrapperPatternViolations(filePath, exemptions, maxLines)
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
  createCheckNonCoreThinHandle,
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
 * @param {number} maxLines Maximum line count for tiny platform adapters.
 * @returns {Array<{ filePath: string, reason: string }>} Wrapper shape violations.
 */
function getWrapperPatternViolations(filePath, exemptions, maxLines) {
  if (exemptions.has(filePath) || !shouldEnforceWrapperPattern(filePath)) {
    return [];
  }

  const source = fs.readFileSync(path.resolve(filePath), 'utf8');
  return getWrapperPatternViolationsForSource(filePath, source, maxLines);
}

/**
 * Check whether source follows the dependency-only wrapper shape.
 * @param {string} filePath Repo-relative file path.
 * @param {string} source JavaScript source text.
 * @param {number} [maxLines] Maximum line count for tiny platform adapters.
 * @returns {Array<{ filePath: string, reason: string }>} Wrapper shape violations.
 */
function getWrapperPatternViolationsForSource(filePath, source, maxLines = 0) {
  if (isPureCoreReExportWrapper(source)) {
    return [];
  }

  if (maxLines > 0 && countSourceLines(source) <= maxLines) {
    return [];
  }

  if (!declaresHandle(source)) {
    return [
      {
        filePath,
        reason:
          'expected `const handle = coreFactory(...)` in this non-core wrapper',
      },
    ];
  }

  if (!exportsHandle(source) && !invokesHandle(source)) {
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
 * Check whether source declares a wrapper handle.
 * @param {string} source JavaScript source text.
 * @returns {boolean} True when a handle declaration is present.
 */
function declaresHandle(source) {
  return [
    /\bconst\s+handle\s*=\s*[A-Za-z_$][\w$]*\s*\(/u,
    /\bconst\s+\{[^}]*\bhandle\b[^}]*\}\s*=\s*[A-Za-z_$][\w$]*\s*\(/u,
    /\bexport\s+const\s+handle\s*=/u,
  ].some(pattern => pattern.test(source));
}

/**
 * Check whether source exports a wrapper handle.
 * @param {string} source JavaScript source text.
 * @returns {boolean} True when the handle is exported.
 */
function exportsHandle(source) {
  return [
    /\bexport\s*\{[^}]*\bhandle\b[^}]*\}/u,
    /\bexport\s+const\s+handle\s*=/u,
  ].some(pattern => pattern.test(source));
}

/**
 * Check whether source invokes a wrapper handle.
 * @param {string} source JavaScript source text.
 * @returns {boolean} True when the handle is invoked.
 */
function invokesHandle(source) {
  return /(?:^|[^\w$])(?:await\s+)?handle\s*\(/u.test(source);
}

/**
 * Count source lines the same way the size gate does.
 * @param {string} source JavaScript source text.
 * @returns {number} Source line count.
 */
function countSourceLines(source) {
  return source.split('\n').length;
}

/**
 * Check whether a file is only a dependency-free re-export from `src/core`.
 * @param {string} source JavaScript source text.
 * @returns {boolean} True when the source contains only core re-export declarations.
 */
function isPureCoreReExportWrapper(source) {
  const executableSource = source
    .replace(/^\s*\/\/.*$/gmu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!executableSource) {
    return false;
  }

  const withoutCoreReExports = executableSource.replace(
    /export\s+(?:\*|\{[^}]*\})\s+from\s+['"](?:\.\.\/)+(?:core\/|commonCore\.js)[^'"]*['"]\s*;?/gu,
    ''
  );

  return withoutCoreReExports.trim() === '';
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
