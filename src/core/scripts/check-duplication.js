import fs from 'node:fs';
import path from 'node:path';
import { spawnSync as defaultSpawnSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');
const CONFIG_PATH = path.join(ROOT_DIR, '.jscpd.json');
const REPORT_PATH = path.join(
  ROOT_DIR,
  'reports',
  'duplication',
  'jscpd-report.json'
);

/**
 * Create the command handler that runs the duplication gate.
 * @param {{
 *   spawnImpl?: typeof defaultSpawnSync,
 *   readFileSync?: typeof fs.readFileSync,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   configPath?: string,
 *   reportPath?: string,
 * }} [options] Gate dependencies.
 * @returns {() => { exitCode: number, clones: number }} Duplication gate handler.
 */
export function createCheckDuplicationHandle(options) {
  return createDuplicationGateHandle(normalizeDuplicationGateOptions(options));
}

/**
 * Normalize the gate dependencies with default repository paths.
 * @param {{
 *   spawnImpl?: typeof defaultSpawnSync,
 *   readFileSync?: typeof fs.readFileSync,
 *   stdout?: { write: (text: string) => void },
 *   stderr?: { write: (text: string) => void },
 *   rootDir?: string,
 *   configPath?: string,
 *   reportPath?: string,
 * }} [options] Optional dependencies.
 * @returns {{
 *   spawnImpl: typeof defaultSpawnSync,
 *   readFileSync: typeof fs.readFileSync,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
 * }} Normalized dependencies.
 */
function normalizeDuplicationGateOptions(options = {}) {
  return {
    spawnImpl: useDefault(options.spawnImpl, defaultSpawnSync),
    readFileSync: useDefault(options.readFileSync, fs.readFileSync),
    stdout: useDefault(options.stdout, process.stdout),
    stderr: useDefault(options.stderr, process.stderr),
    rootDir: useDefault(options.rootDir, ROOT_DIR),
    configPath: useDefault(options.configPath, CONFIG_PATH),
    reportPath: useDefault(options.reportPath, REPORT_PATH),
  };
}

/**
 * Build the gate handler from normalized dependencies.
 * @param {{
 *   spawnImpl: typeof defaultSpawnSync,
 *   readFileSync: typeof fs.readFileSync,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
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
 *   spawnImpl: typeof defaultSpawnSync,
 *   readFileSync: typeof fs.readFileSync,
 *   stdout: { write: (text: string) => void },
 *   stderr: { write: (text: string) => void },
 *   rootDir: string,
 *   configPath: string,
 *   reportPath: string,
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
}) {
  const runResult = spawnImpl('jscpd', ['--config', configPath], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const launchFailure = handleLaunchFailure(runResult, stderr);
  if (launchFailure) {
    return launchFailure;
  }

  const report = readDuplicationReport(readFileSync, reportPath);
  if (!report) {
    stderr.write(
      `Duplication gate could not read report at ${path.relative(rootDir, reportPath)}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  const cloneFailure = handleCloneFailure(report, rootDir, reportPath, stderr);
  if (cloneFailure) {
    return cloneFailure;
  }

  stdout.write('Checked duplication report: 0 clones.\n');
  return { exitCode: 0, clones: 0 };
}

/**
 * Convert a failed launch into a gate result.
 * @param {{ error?: { message: string }, signal?: string | null, status?: number | null }} runResult Spawn result.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @returns {{ exitCode: number, clones: number } | null} Failure result or null.
 */
function handleLaunchFailure(runResult, stderr) {
  if (runResult.error) {
    stderr.write(
      `Duplication gate failed to launch jscpd: ${runResult.error.message}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  if (runResult.signal) {
    stderr.write(
      `Duplication gate was terminated by signal ${runResult.signal}\n`
    );
    return { exitCode: 1, clones: 0 };
  }

  if (runResult.status !== 0) {
    return { exitCode: getExitCode(runResult.status), clones: 0 };
  }

  return null;
}

/**
 * Convert a clone report into a failure when clones are present.
 * @param {Record<string, unknown>} report Parsed report payload.
 * @param {string} rootDir Repository root directory.
 * @param {string} reportPath Clone report path.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @returns {{ exitCode: number, clones: number } | null} Failure result or null.
 */
function handleCloneFailure(report, rootDir, reportPath, stderr) {
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
    `See ${path.relative(rootDir, reportPath)} for the detailed clone report.\n`
  );
  return { exitCode: 1, clones };
}

/**
 * Read and parse the jscpd report.
 * @param {typeof fs.readFileSync} readFileSync File reader.
 * @param {string} reportPath Report path.
 * @returns {Record<string, unknown> | null} Parsed report or null.
 */
function readDuplicationReport(readFileSync, reportPath) {
  try {
    return JSON.parse(readFileSync(reportPath, 'utf8'));
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
  const duplicates = report?.duplicates;
  if (Array.isArray(duplicates)) {
    return duplicates.length;
  }

  const total = report?.statistics?.total;
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
  const total = report?.statistics?.total;
  if (!total) {
    return '';
  }

  const cloneSuffix = formatCloneSuffix(total.clones);
  return `Report summary: ${total.clones} clone${cloneSuffix}, ${total.percentage}% duplicated lines, ${total.percentageTokens}% duplicated tokens.`;
}

/**
 * Return the plural suffix for "clone".
 * @param {number} cloneCount Clone count.
 * @returns {'' | 's'} Plural suffix.
 */
function formatCloneSuffix(cloneCount) {
  if (cloneCount === 1) {
    return '';
  }

  return 's';
}

/**
 * Use a default value when the provided value is undefined.
 * @template T
 * @param {T | undefined} value Candidate value.
 * @param {T} defaultValue Fallback value.
 * @returns {T} Selected value.
 */
function useDefault(value, defaultValue) {
  if (typeof value !== 'undefined') {
    return value;
  }

  return defaultValue;
}

/**
 * Normalize a spawn exit status into an exit code.
 * @param {number | null | undefined} status Spawn exit status.
 * @returns {number} Exit code.
 */
function getExitCode(status) {
  if (typeof status === 'number') {
    return status;
  }

  return 1;
}
