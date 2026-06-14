import {
  pluralizeCount,
  runGateCommand,
  useDefaultValue,
} from './gate-utils.js';
import { createDefaultGateScriptOptions } from './gate-script-defaults.js';
import { parseJsonOrNull } from '../commonCore.js';

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
function executeDuplicationGate({
  spawnImpl,
  readFileSync,
  stdout,
  stderr,
  rootDir,
  configPath,
  reportPath,
  relativePath,
}) {
  const { launchFailure } = runGateCommand({
    spawnImpl,
    command: 'jscpd',
    args: ['--config', configPath],
    rootDir,
    stderr,
    launchLabel: getDuplicationGateLabel(),
    commandLabel: 'jscpd',
  });

  if (launchFailure) {
    return { exitCode: launchFailure.exitCode, clones: 0 };
  }

  const report = readDuplicationReport(readFileSync, reportPath);
  if (!report) {
    stderr.write(
      `Duplication gate could not read report at ${relativePath(rootDir, reportPath)}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  const cloneFailure = handleCloneFailure(
    report,
    {
      rootDir,
      reportPath,
      relativePath,
    },
    stderr
  );
  if (cloneFailure) {
    return cloneFailure;
  }

  stdout.write('Checked duplication report: 0 clones.\n');
  return { exitCode: 0, clones: 0 };
}

/**
 * Convert a clone report into a failure when clones are present.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @param {{
 *   rootDir: string,
 *   reportPath: string,
 *   relativePath: (from: string, to: string) => string,
 * }} reportInfo Report path details.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @returns {{ exitCode: number, clones: number } | null} Failure result or null.
 */
function handleCloneFailure(report, reportInfo, stderr) {
  const { rootDir, reportPath, relativePath } = reportInfo;
  const clones = countClones(report);
  if (clones <= 0) {
    return null;
  }

  stderr.write(
    `Duplication gate found ${clones} clone${formatCloneSuffix(clones)}.\n`
  );

  const summary = summarizeReport(report);
  if (summary) {
    stderr.write(`${summary}\n`);
  }

  stderr.write(
    `See ${relativePath(rootDir, reportPath)} for the detailed clone report.\n`
  );
  return { exitCode: 1, clones };
}

/**
 * Read and parse the jscpd report.
 * @param {(filePath: string, encoding: 'utf8') => string} readFileSync File reader.
 * @param {string} reportPath Report path.
 * @returns {Record<string, unknown> | null} Parsed report or null.
 */
function readDuplicationReport(readFileSync, reportPath) {
  try {
    return /** @type {Record<string, unknown> | null} */ (
      parseJsonOrNull(readFileSync(reportPath, 'utf8'))
    );
  } catch {
    return null;
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
  if (total && typeof total.clones === 'number') {
    return total.clones;
  }

  return 0;
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
  const cloneSuffix = formatCloneSuffix(cloneCount);
  return `Report summary: ${cloneCount} clone${cloneSuffix}, ${total.percentage}% duplicated lines, ${total.percentageTokens}% duplicated tokens.`;
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

/**
 * Return the plural suffix for "clone".
 * @param {number} cloneCount Clone count.
 * @returns {'' | 's'} Plural suffix.
 */
function formatCloneSuffix(cloneCount) {
  return pluralizeCount(cloneCount);
}
