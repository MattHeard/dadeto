/**
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   command: string,
 *   args: string[],
 *   rootDir: string,
 * }} options Spawned gate input.
 * @returns {{ status?: number | null, signal?: string | null, error?: Error }} Spawn result.
 */
export function spawnGateCommand(options) {
  return options.spawnImpl(options.command, options.args, {
    cwd: options.rootDir,
    stdio: 'inherit',
  });
}

/**
 * Run a gate command and normalize the launch failure handling.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   command: string,
 *   args: string[],
 *   rootDir: string,
 *   stderr: { write: (text: string) => void },
 *   launchLabel: string,
 *   commandLabel: string,
 * }} options Gate command input.
 * @returns {{ launchFailure: { exitCode: number } | null }} Gate command outcome.
 */
export function runGateCommand(options) {
  const runResult = spawnGateCommand(options);
  const launchFailure = handleSpawnFailure(
    runResult,
    options.stderr,
    options.launchLabel,
    options.commandLabel
  );

  return { launchFailure };
}

/**
 * @param {{ error?: { message: string }, signal?: string | null, status?: number | null }} runResult Spawn result.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @param {string} launchLabel Human-readable gate label.
 * @param {string} commandLabel Command name for launch messages.
 * @returns {{ exitCode: number } | null} Failure result or null.
 */
export function handleSpawnFailure(
  runResult,
  stderr,
  launchLabel,
  commandLabel
) {
  if (runResult.error) {
    return writeLaunchFailure(
      stderr,
      `${launchLabel} failed to launch ${commandLabel}: ${runResult.error.message}\n`
    );
  }

  if (runResult.signal) {
    return writeLaunchFailure(
      stderr,
      `${launchLabel} was terminated by signal ${runResult.signal}\n`
    );
  }

  if (runResult.status !== 0) {
    return { exitCode: normalizeExitCode(runResult.status) };
  }

  return null;
}

/**
 * Write a launch failure message and return the standardized failure code.
 * @param {{ write: (text: string) => void }} stderr Error writer.
 * @param {string} message Failure message.
 * @returns {{ exitCode: number }} Standard failure result.
 */
function writeLaunchFailure(stderr, message) {
  stderr.write(message);
  return { exitCode: 1 };
}

/**
 * @param {number | null | undefined} status Spawn status.
 * @returns {number} Exit code.
 */
export function normalizeExitCode(status) {
  if (typeof status === 'number') {
    return status;
  }

  return 1;
}

/**
 * Use a default value when the provided value is undefined.
 * @template T
 * @param {T | undefined} value Candidate value.
 * @param {T} defaultValue Fallback value.
 * @returns {T} Selected value.
 */
export function useDefaultValue(value, defaultValue) {
  if (typeof value !== 'undefined') {
    return value;
  }

  return defaultValue;
}

/**
 * Return the plural suffix for a count.
 * @param {number} count Item count.
 * @returns {'' | 's'} Plural suffix.
 */
export function pluralizeCount(count) {
  if (count === 1) {
    return '';
  }

  return 's';
}

/**
 * Build a standard gate handler around a command launcher and a result evaluator.
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   command: string,
 *   args: string[],
 *   rootDir: string,
 *   stderr: { write: (text: string) => void },
 *   launchLabel: string,
 *   commandLabel: string,
 *   readResult: () => { exitCode: number, count: number, message?: string } | null,
 *   onSuccess: () => void,
 * }} options Gate execution inputs.
 * @returns {{ exitCode: number, count: number }} Gate execution outcome.
 */
export function executeStandardGate({
  spawnImpl,
  command,
  args,
  rootDir,
  stderr,
  launchLabel,
  commandLabel,
  readResult,
  onSuccess,
}) {
  const launchFailure = runGateCommand({
    spawnImpl,
    command,
    args,
    rootDir,
    stderr,
    launchLabel,
    commandLabel,
  }).launchFailure;

  if (launchFailure) {
    return { exitCode: launchFailure.exitCode, count: 0 };
  }

  const result = readResult();
  if (!result) {
    return { exitCode: 1, count: 0 };
  }

  if (result.count > 0) {
    if (result.message) {
      stderr.write(result.message);
    }
    return { exitCode: result.exitCode, count: result.count };
  }

  onSuccess();
  return { exitCode: 0, count: 0 };
}
