import path from 'node:path';

const DEFAULT_ROOT_DIR = '.';
const DEFAULT_SOURCE_ROOT = 'src/core';
const DEFAULT_CONFIG_PATH = 'dependency-cruiser.config.cjs';
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };
const DEFAULT_SPAWN_RESULT = { status: 0, signal: null };
const MATH_RANDOM_NEEDLE = ['Math', 'random'].join('.');

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
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, violations: number }} Dependency gate handler.
 */
export function createCheckDepcruiseHandle(options = {}) {
  return createDepcruiseGateHandle(normalizeCheckDepcruiseOptions(options));
}

/**
 * Find direct injected-random usage in src/core files.
 * @param {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>,
 *   rootDir: string,
 *   sourceRoot: string,
 * }} deps Filesystem dependencies.
 * @returns {Array<{ filePath: string, occurrences: number }>} Files that directly use the injected random source.
 */
export function findCoreMathRandomViolations({
  readFileSync,
  readdirSync,
  rootDir,
  sourceRoot,
}) {
  const sourceRootPath = path.resolve(rootDir, sourceRoot);
  return listJsFiles(sourceRootPath, readdirSync).flatMap(filePath => {
    const source = readFileSync(filePath, 'utf8');
    const occurrences = countMathRandomOccurrences(source);

    if (occurrences <= 0) {
      return [];
    }

    return [
      {
        filePath: toRepoRelativePath(rootDir, filePath),
        occurrences,
      },
    ];
  });
}

export const checkDepcruiseTestUtils = {
  normalizeCheckDepcruiseOptions,
  scanQuotedString,
  isBoundary,
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
 * }} Normalized dependencies.
 */
function normalizeCheckDepcruiseOptions(options = {}) {
  return {
    spawnImpl: resolveOption(options.spawnImpl, () => DEFAULT_SPAWN_RESULT),
    readFileSync: resolveOption(options.readFileSync, () => ''),
    readdirSync: resolveOption(options.readdirSync, () => []),
    stdout: resolveOption(options.stdout, DEFAULT_STDOUT),
    stderr: resolveOption(options.stderr, DEFAULT_STDERR),
    rootDir: resolveOption(options.rootDir, DEFAULT_ROOT_DIR),
    sourceRoot: resolveOption(options.sourceRoot, DEFAULT_SOURCE_ROOT),
    configPath: resolveOption(options.configPath, DEFAULT_CONFIG_PATH),
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
}) {
  const runResult = spawnImpl('depcruise', ['--config', configPath, 'src'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const launchFailure = handleLaunchFailure(runResult, stderr);
  if (launchFailure) {
    return launchFailure;
  }

  const violations = findCoreMathRandomViolations({
    readFileSync,
    readdirSync,
    rootDir,
    sourceRoot,
  });

  if (violations.length > 0) {
    stderr.write(
      `Dependency-cruiser core policy found ${violations.length} violation${pluralize(violations.length)}.\n`
    );

    violations.forEach(({ filePath, occurrences }) => {
      stderr.write(
        `${filePath} uses the injected random source directly ${occurrences} time${pluralize(occurrences)}.\n`
      );
    });

    return { exitCode: 1, violations: violations.length };
  }

  stdout.write('Checked dependency-cruiser: no core random dependencies.\n');
  return { exitCode: 0, violations: 0 };
}

/**
 * Convert a failed launch into a gate result.
 * @param {{ error?: { message: string }, signal?: string | null, status?: number | null }} runResult Spawn result.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @returns {{ exitCode: number, violations: number } | null} Failure result or null.
 */
function handleLaunchFailure(runResult, stderr) {
  if (runResult.error) {
    stderr.write(
      `Dependency-cruiser gate failed to launch depcruise: ${runResult.error.message}\n`
    );
    return { exitCode: 1, violations: 0 };
  }

  if (runResult.signal) {
    stderr.write(
      `Dependency-cruiser gate was terminated by signal ${runResult.signal}\n`
    );
    return { exitCode: 1, violations: 0 };
  }

  if (runResult.status !== 0) {
    return { exitCode: getExitCode(runResult.status), violations: 0 };
  }

  return null;
}

/**
 * Read JavaScript files recursively from a directory.
 * @param {string} dirPath Directory to scan.
 * @param {(dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }>} readdirSync Directory reader.
 * @returns {string[]} Absolute JavaScript file paths.
 */
function listJsFiles(dirPath, readdirSync) {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap(entry => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listJsFiles(entryPath, readdirSync);
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      return [entryPath];
    }

    return [];
  });
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
    return scanQuotedString(source, index, "'", 'code');
  }

  if (state === 'double-quote') {
    return scanQuotedString(source, index, '"', 'code');
  }

  return scanTemplateString(source, index);
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

  if (isMathRandomAtIndex(source, index, needleLength)) {
    return { count: 1, nextIndex: index + needleLength, nextState: 'code' };
  }

  return { count: 0, nextIndex: index + 1, nextState: 'code' };
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
    return { count: 0, nextIndex: index + 2, nextState: 'line-comment' };
  }

  if (current === '/' && next === '*') {
    return { count: 0, nextIndex: index + 2, nextState: 'block-comment' };
  }

  if (current === "'") {
    return { count: 0, nextIndex: index + 1, nextState: 'single-quote' };
  }

  if (current === '"') {
    return { count: 0, nextIndex: index + 1, nextState: 'double-quote' };
  }

  if (current === '`') {
    return { count: 0, nextIndex: index + 1, nextState: 'template' };
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
    return { count: 0, nextIndex: index + 1, nextState: 'code' };
  }

  return { count: 0, nextIndex: index + 1, nextState: 'line-comment' };
}

/**
 * Scan through a block comment.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanBlockComment(source, index) {
  if (source[index] === '*' && source[index + 1] === '/') {
    return { count: 0, nextIndex: index + 2, nextState: 'code' };
  }

  return { count: 0, nextIndex: index + 1, nextState: 'block-comment' };
}

/**
 * Scan through a quoted string.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {"'" | '"'} quote Quote delimiter.
 * @param {string} nextState State to resume after the string.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanQuotedString(source, index, quote, nextState) {
  if (source[index] === '\\') {
    return { count: 0, nextIndex: index + 2, nextState };
  }

  if (source[index] === quote) {
    return { count: 0, nextIndex: index + 1, nextState: 'code' };
  }

  return { count: 0, nextIndex: index + 1, nextState };
}

/**
 * Scan through a template literal.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @returns {{ count: number, nextIndex: number, nextState: string }} Scan result.
 */
function scanTemplateString(source, index) {
  if (source[index] === '\\') {
    return { count: 0, nextIndex: index + 2, nextState: 'template' };
  }

  if (source[index] === '`') {
    return { count: 0, nextIndex: index + 1, nextState: 'code' };
  }

  return { count: 0, nextIndex: index + 1, nextState: 'template' };
}

/**
 * Tell whether the target random source appears at a given index.
 * @param {string} source Source text.
 * @param {number} index Current index.
 * @param {number} needleLength Length of the target string.
 * @returns {boolean} True when the target appears at the current index.
 */
function isMathRandomAtIndex(source, index, needleLength) {
  if (!source.startsWith(MATH_RANDOM_NEEDLE, index)) {
    return false;
  }

  const hasLowerBoundary = isBoundary(source[index - 1]);
  const hasUpperBoundary = isBoundary(source[index + needleLength]);

  return hasLowerBoundary && hasUpperBoundary;
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

/**
 * Format a singular or plural suffix.
 * @param {number} count Item count.
 * @returns {string} Suffix for singular/plural output.
 */
function pluralize(count) {
  if (count === 1) {
    return '';
  }

  return 's';
}

/**
 * Return the provided option or a fallback when it is missing.
 * @template T
 * @param {T | undefined} value Optional value.
 * @param {T} fallback Fallback value.
 * @returns {T} Provided value or fallback.
 */
function resolveOption(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return value;
}

/**
 * Convert a path to a repo-relative POSIX path.
 * @param {string} rootDir Repository root.
 * @param {string} absolutePath Absolute file path.
 * @returns {string} Repo-relative path.
 */
function toRepoRelativePath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).replaceAll(path.sep, '/');
}

/**
 * Convert a process status to an exit code.
 * @param {number | null | undefined} status Spawn status.
 * @returns {number} Exit code.
 */
function getExitCode(status) {
  if (typeof status === 'number') {
    return status;
  }

  return 1;
}
