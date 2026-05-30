const DEFAULT_ROOT_DIR = '.';
const DEFAULT_CONFIG_PATH = '.jscpd.json';
const DEFAULT_REPORT_PATH = 'reports/duplication/jscpd-report.json';
const DEFAULT_RELATIVE_PATH = (_, target) => target;
const DEFAULT_SPAWN_RESULT = { status: 0, signal: null };
const DEFAULT_STDOUT = { write() {} };
const DEFAULT_STDERR = { write() {} };

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
    spawnImpl: useDefault(options.spawnImpl, () => DEFAULT_SPAWN_RESULT),
    readFileSync: useDefault(options.readFileSync, () => '{}'),
    stdout: useDefault(options.stdout, DEFAULT_STDOUT),
    stderr: useDefault(options.stderr, DEFAULT_STDERR),
    rootDir: useDefault(options.rootDir, DEFAULT_ROOT_DIR),
    configPath: useDefault(options.configPath, DEFAULT_CONFIG_PATH),
    reportPath: useDefault(options.reportPath, DEFAULT_REPORT_PATH),
    relativePath: useDefault(options.relativePath, DEFAULT_RELATIVE_PATH),
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
