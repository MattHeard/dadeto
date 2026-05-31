/**
 * @param {{
 *   spawnImpl: (command: string, args: string[], options: Record<string, unknown>) => { status?: number | null, signal?: string | null, error?: Error },
 *   command: string,
 *   args: string[],
 *   rootDir: string,
 *   stderr: { write: (text: string) => void },
 *   launchLabel: string,
 *   commandLabel: string,
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
    stderr.write(
      `${launchLabel} failed to launch ${commandLabel}: ${runResult.error.message}\n`
    );
    return { exitCode: 1 };
  }

  if (runResult.signal) {
    stderr.write(
      `${launchLabel} was terminated by signal ${runResult.signal}\n`
    );
    return { exitCode: 1 };
  }

  if (runResult.status !== 0) {
    return { exitCode: normalizeExitCode(runResult.status) };
  }

  return null;
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
