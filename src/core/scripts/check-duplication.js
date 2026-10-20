import {
  pluralizeCount,
  runGateCommand,
  useDefaultValue,
} from './gate-utils.js';
import { createDefaultGateScriptOptions } from './gate-script-defaults.js';
import { parseObjectRecord } from '../browser/validation.js';

/**
 * @returns {string} Duplication gate label.
 */
function getDuplicationGateLabel() {
  return 'Duplication gate';
}

const DEFAULT_CONFIG_PATH = '.jscpd.json';
const DEFAULT_REPORT_PATH = 'reports/duplication/jscpd-report.json';
/** @type {(from: string, to: string) => string} */
const DEFAULT_RELATIVE_PATH = (_, target) => target;
const DEFAULT_GATE_OPTIONS = createDefaultGateScriptOptions();

/**
 * Create the command handler that runs the duplication gate.
 * @param {{
 *   spawnImpl?: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   configPath?: string,
 *   reportPath?: string,
 *   relativePath?: (from: string, to: string) => string,
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, clones: number }} Duplication gate handler.
 */
export function createCheckDuplicationHandle(options) {
  return createDuplicationGateHandle(normalizeDuplicationGateOptions(options));
}

/**
 * Normalize the gate dependencies with default repository paths.
 * @param {{
 *   spawnImpl?: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   configPath?: string,
 *   reportPath?: string,
 *   relativePath?: (from: string, to: string) => string,
 * }} [options] Optional dependencies.
 * @returns {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
 *   relativePath: (from: string, to: string) => string,
 * }} Normalized dependencies.
 */
function normalizeDuplicationGateOptions(options = {}) {
  return {
    spawnImpl: useDefaultValue(
      options.spawnImpl,
      () => DEFAULT_GATE_OPTIONS.spawnResult
    ),
    readFileSync: useDefaultValue(options.readFileSync, () => '{}'),
    stdout: useDefaultValue(options.stdout, DEFAULT_GATE_OPTIONS.stdout),
    stderr: useDefaultValue(options.stderr, DEFAULT_GATE_OPTIONS.stderr),
    rootDir: useDefaultValue(options.rootDir, DEFAULT_GATE_OPTIONS.rootDir),
    configPath: useDefaultValue(options.configPath, DEFAULT_CONFIG_PATH),
    reportPath: useDefaultValue(options.reportPath, DEFAULT_REPORT_PATH),
    relativePath: useDefaultValue(options.relativePath, DEFAULT_RELATIVE_PATH),
  };
}

/**
 * Build the gate handler from normalized dependencies.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
 *   relativePath: (from: string, to: string) => string,
 * }} deps Normalized dependencies.
 * @returns {() => { exitCode: number, clones: number }} Gate handler.
 */
function createDuplicationGateHandle(deps) {
  return function handleDuplicationGate() {
    return executeDuplicationGate(deps);
  };
}

/**
 * Execute the duplication gate and return the exit summary.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
 *   relativePath: (from: string, to: string) => string,
 * }} deps Gate dependencies.
 * @returns {{ exitCode: number, clones: number }} Gate outcome.
 */
function executeDuplicationGate(deps) {
  const { launchFailure } = runGateCommand({
    spawnImpl: deps.spawnImpl,
    command: 'node',
    args: ['src/local/run-clone-scanner.js', deps.configPath],
    rootDir: deps.rootDir,
    stderr: deps.stderr,
    launchLabel: getDuplicationGateLabel(),
    commandLabel: 'jscpd',
  });

  if (launchFailure) {
    return { exitCode: launchFailure.exitCode, clones: 0 };
  }

  const report = readDuplicationReport(deps.readFileSync, deps.reportPath);
  if (report === null) {
    deps.stderr.write(
      `Duplication gate could not read report at ${deps.relativePath(deps.rootDir, deps.reportPath)}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  const cloneFailure = handleCloneFailure(
    report,
    deps.relativePath(deps.rootDir, deps.reportPath),
    deps.stderr
  );
  if (cloneFailure) {
    return cloneFailure;
  }

  deps.stdout.write('Checked duplication report: 0 clones.\n');
  return { exitCode: 0, clones: 0 };
}

/**
 * Convert a clone report into a failure when clones are present.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @param {string} relativeReportPath Path to the report relative to the project root.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @returns {{ exitCode: number, clones: number } | null} Failure result or null.
 */
function handleCloneFailure(report, relativeReportPath, stderr) {
  const clones = countClones(report);
  if (clones <= 0) {
    return null;
  }

  stderr.write(
    `Duplication gate found ${clones} clone${pluralizeCount(clones)}.\n`
  );

  const summary = summarizeReport(report);
  if (summary) {
    stderr.write(`${summary}\n`);
  }
  const cloneLocations = summarizeCloneLocations(report);
  if (cloneLocations) {
    stderr.write(`${cloneLocations}\n`);
  }

  stderr.write(`See ${relativeReportPath} for the detailed clone report.\n`);
  return { exitCode: 1, clones };
}

/**
 * Show a bounded set of source locations from the clone report.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @returns {string} Readable locations or an empty string when unavailable.
 */
function summarizeCloneLocations(report) {
  const duplicates = /** @type {unknown[]} */ (
    Array.isArray(report.duplicates) ? report.duplicates : []
  );
  const locations = [];
  for (const value of duplicates) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const clone = /** @type {{firstFile?: unknown, secondFile?: unknown}} */ (
      value
    );
    const first = formatClonePosition(clone.firstFile);
    const second = formatClonePosition(clone.secondFile);
    if (!first || !second) continue;
    locations.push(`  ${first} ↔ ${second}`);
    if (locations.length === 5) break;
  }
  if (locations.length === 0) return '';
  const remaining = Math.max(0, duplicates.length - locations.length);
  const suffix = remaining
    ? `\n  ${remaining} more clone(s); see detailed report.`
    : '';
  return `Clone locations (up to 5 shown):\n${locations.join('\n')}${suffix}`;
}

/**
 * Format one safe file and line range from a clone report.
 * @param {unknown} value Clone file location.
 * @returns {string} File and line range or an empty string when malformed.
 */
function formatClonePosition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const location =
    /** @type {{name?: unknown, start?: unknown, end?: unknown}} */ (value);
  if (
    typeof location.name !== 'string' ||
    location.name.length === 0 ||
    location.name !== location.name.trim() ||
    location.name.includes(String.fromCharCode(10)) ||
    location.name.includes(String.fromCharCode(13)) ||
    typeof location.start !== 'number' ||
    typeof location.end !== 'number' ||
    !Number.isSafeInteger(location.start) ||
    !Number.isSafeInteger(location.end) ||
    location.start < 1 ||
    location.end < location.start
  ) {
    return '';
  }
  const range = location.end > location.start ? `-${location.end}` : '';
  return `${location.name}:${location.start}${range}`;
}

/**
 * Read and parse the jscpd report.
 * @param {(filePath: string, encoding: 'utf8') => string} readFileSync File reader.
 * @param {string} reportPath Report path.
 * @returns {Record<string, unknown> | null} Parsed report or null.
 */
function readDuplicationReport(readFileSync, reportPath) {
  try {
    return parseObjectRecord(readFileSync(reportPath, 'utf8'));
  } catch {
    return /** @type {null} */ (null);
  }
}

/**
 * Count the number of clones in a duplication report.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @returns {number} Clone count.
 */
function countClones(report) {
  const duplicates = /** @type {Array<unknown> | undefined} */ (
    report.duplicates
  );
  if (Array.isArray(duplicates)) {
    return duplicates.length;
  }

  const total = getDuplicationStatistics(report).total;
  if (!total || typeof total.clones !== 'number') {
    return 0;
  }
  return total.clones;
}

/**
 * Render a readable report summary.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @returns {string} Human-readable summary.
 */
function summarizeReport(report) {
  const total = getDuplicationStatistics(report).total;
  if (!total) {
    return '';
  }

  let cloneCount = 0;
  if (typeof total.clones === 'number') {
    cloneCount = total.clones;
  }
  return `Report summary: ${cloneCount} clone${pluralizeCount(cloneCount)}, ${total.percentage}% duplicated lines, ${total.percentageTokens}% duplicated tokens.`;
}

/**
 * Read the statistics payload from a duplication report.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @returns {{ total?: { clones?: number, percentage?: number, percentageTokens?: number } }} Statistics payload.
 */
function getDuplicationStatistics(report) {
  const statistics =
    /** @type {{ total?: { clones?: number, percentage?: number, percentageTokens?: number } } | undefined} */ (
      report.statistics
    );

  return statistics ?? {};
}
