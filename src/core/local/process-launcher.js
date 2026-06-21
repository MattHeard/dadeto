import { normalizeMaybeNumber } from '../commonCore.js';
/**
 * Open append-only run log files for a spawned process.
 * @param {{
 *   logDir: string,
 *   runId: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   mkdirImpl?: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl?: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
 * }} options Run-log dependencies.
 * @returns {Promise<{
 *   stdoutPath: string,
 *   stderrPath: string,
 *   stdoutFd: number,
 *   stderrFd: number,
 *   stdoutHandle: { close?: () => Promise<void> | void },
 *   stderrHandle: { close?: () => Promise<void> | void }
 * }>} Opened append-only run log files.
 */
export async function openAppendOnlyRunLogFiles(options) {
  const mkdirImpl = /** @type {any} */ (options.mkdirImpl);
  const openImpl = /** @type {any} */ (options.openImpl);
  const runsDir = options.pathModule.join(options.logDir, 'runs');
  await mkdirImpl(runsDir, { recursive: true });

  const baseName = options.runId.replaceAll(':', '-');
  const stdoutPath = options.pathModule.join(
    runsDir,
    `${baseName}--stdout.log`
  );
  const stderrPath = options.pathModule.join(
    runsDir,
    `${baseName}--stderr.log`
  );
  const [stdoutHandle, stderrHandle] = await Promise.all([
    openImpl(stdoutPath, 'a'),
    openImpl(stderrPath, 'a'),
  ]);

  return {
    stdoutPath,
    stderrPath,
    stdoutFd: stdoutHandle.fd,
    stderrFd: stderrHandle.fd,
    stdoutHandle,
    stderrHandle,
  };
}

/**
 * Close any open run log file handles.
 * @param {{
 *   stdoutHandle?: { close?: () => Promise<void> | void },
 *   stderrHandle?: { close?: () => Promise<void> | void }
 * }} handles Run log handles.
 * @param {string} errorLabel Label used when reporting close failures.
 * @returns {Promise<void>} Nothing.
 */
export async function closeRunLogHandles(handles, errorLabel) {
  const closers = [];

  if (
    handles.stdoutHandle &&
    typeof handles.stdoutHandle.close === 'function'
  ) {
    closers.push(handles.stdoutHandle.close());
  }

  if (
    handles.stderrHandle &&
    typeof handles.stderrHandle.close === 'function'
  ) {
    closers.push(handles.stderrHandle.close());
  }

  if (closers.length === 0) {
    return;
  }

  const results = await Promise.allSettled(closers);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(errorLabel, result.reason);
    }
  }
}

/**
 * Resolve launch arguments from the wrapper options.
 * @param {{
 *   args?: string[],
 *   resolveArgs?: (payload: Record<string, unknown>) => string[],
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @returns {string[]} Launch arguments.
 */
function resolveLaunchArgs(options, payload) {
  if (typeof options.resolveArgs === 'function') {
    return options.resolveArgs(/** @type {any} */ (payload));
  }

  return [...(options.args ?? []), String(payload.prompt ?? '')];
}

/**
 * Resolve the working directory for a launch.
 * @param {{
 *   cwd?: string,
 *   resolveCwd?: (payload: Record<string, unknown>) => string,
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @returns {string} Launch working directory.
 */
function resolveLaunchCwd(options, payload) {
  if (typeof options.resolveCwd === 'function') {
    return options.resolveCwd(/** @type {any} */ (payload));
  }

  return /** @type {string} */ (
    options.cwd ?? /** @type {any} */ (payload).repoRoot
  );
}

/**
 * Resolve the log directory for a launch.
 * @param {{
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   resolveLogDir?: (payload: Record<string, unknown>) => string,
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @returns {string} Launch log directory.
 */
function resolveLaunchLogDir(options, payload) {
  const typedOptions = /** @type {any} */ (options);

  if (typeof typedOptions.resolveLogDir === 'function') {
    return typedOptions.resolveLogDir(/** @type {any} */ (payload));
  }

  if (typedOptions.logDir) {
    return typedOptions.logDir;
  }

  return typedOptions.pathModule.join(
    payload.repoRoot,
    'tracking',
    typedOptions.logDirSuffix ?? 'launcher'
  );
}

/**
 * Resolve the exit error label for a launch.
 * @param {{
 *   exitErrorLabel: string | ((payload: Record<string, unknown>) => string),
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @returns {string} Exit error label.
 */
function resolveLaunchExitErrorLabel(options, payload) {
  if (typeof options.exitErrorLabel === 'function') {
    return options.exitErrorLabel(/** @type {any} */ (payload));
  }

  return options.exitErrorLabel;
}

/**
 * Build the exit payload passed to the optional onExit hook.
 * @param {{
 *   runId: string,
 *   buildExitPayload?: (payload: Record<string, unknown>, input: { runId: string, exitCode: number | null, signal: string | null }) => { runId: string, exitCode: number | null, signal: string | null },
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @param {number | null | undefined} code Exit code value.
 * @param {string | null | undefined} signal Exit signal value.
 * @returns {{ runId: string, exitCode: number | null, signal: string | null }} Exit payload.
 */
function resolveExitPayload(options, payload, code, signal) {
  const typedOptions = /** @type {any} */ (options);
  const normalizedExitCode = normalizeMaybeNumber(code);
  const normalizedSignal = signal ?? null;

  if (typeof typedOptions.buildExitPayload === 'function') {
    return typedOptions.buildExitPayload(/** @type {any} */ (payload), {
      runId: payload.runId,
      exitCode: normalizedExitCode,
      signal: normalizedSignal,
    });
  }

  return {
    runId: /** @type {string} */ (/** @type {any} */ (payload).runId),
    exitCode: normalizedExitCode,
    signal: normalizedSignal,
  };
}

/**
 * Launch a detached process with append-only logs and an optional exit handler.
 * @param {{
 *   command: string,
 *   args: string[],
 *   repoRoot: string,
 *   runId: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   mkdirImpl?: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl?: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
 *   spawnImpl?: (command: string, args: string[], options: { cwd: string, detached: true, stdio: ['ignore', number, number] }) => { pid?: number, once?: (event: string, handler: (code: number | null, signal: string | null) => unknown) => void, unref?: () => void },
 *   onExit?: (payload: { runId: string, exitCode: number | null, signal: string | null }) => unknown,
 *   buildExitPayload?: (payload: Record<string, unknown>, input: { runId: string, exitCode: number | null, signal: string | null }) => { runId: string, exitCode: number | null, signal: string | null },
 *   closeErrorLabel: string,
 *   exitErrorLabel: string,
 *   launcherKind?: string,
 * }} options Launcher dependencies.
 * @returns {Promise<{
 *   launcherKind: string,
 *   command: string,
 *   args: string[],
 *   pid: number | null,
 *   stdoutPath: string,
 *   stderrPath: string
 * }>} Launched process details.
 */
export async function launchDetachedProcessWithRunLogs(options) {
  const typedOptions = /** @type {any} */ (options);
  const spawnImpl = /** @type {any} */ (
    typedOptions.spawnImpl ??
      (() => {
        throw new Error('spawnImpl is required');
      })
  );
  const logDir =
    typedOptions.logDir ??
    typedOptions.pathModule.join(
      typedOptions.repoRoot,
      'tracking',
      typedOptions.logDirSuffix ?? 'launcher'
    );

  const {
    stdoutPath,
    stderrPath,
    stdoutFd,
    stderrFd,
    stdoutHandle,
    stderrHandle,
  } = await openAppendOnlyRunLogFiles({
    logDir,
    pathModule: options.pathModule,
    runId: typedOptions.runId,
    mkdirImpl: typedOptions.mkdirImpl,
    openImpl: typedOptions.openImpl,
  });

  let child;
  try {
    child = spawnImpl(typedOptions.command, typedOptions.args, {
      cwd: typedOptions.cwd ?? typedOptions.repoRoot,
      detached: true,
      stdio: ['ignore', stdoutFd, stderrFd],
    });
  } finally {
    await closeRunLogHandles(
      { stdoutHandle, stderrHandle },
      options.closeErrorLabel
    );
  }

  if (typeof options.onExit === 'function') {
    child.once('exit', (/** @type {any} */ code, /** @type {any} */ signal) => {
      const exitPayload = resolveExitPayload(
        typedOptions,
        { runId: typedOptions.runId },
        code,
        signal
      );

      Promise.resolve(typedOptions.onExit(exitPayload)).catch(error => {
        console.error(typedOptions.exitErrorLabel, error);
      });
    });
  }

  child.unref();

  return {
    launcherKind: typedOptions.launcherKind ?? 'codex',
    command: typedOptions.command,
    args: typedOptions.args,
    pid: normalizeMaybeNumber(child.pid),
    stdoutPath,
    stderrPath,
  };
}

/**
 * Create a thin launcher wrapper around detached run-log process launching.
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   mkdirImpl?: any,
 *   openImpl?: any,
 *   spawnImpl?: any,
 *   launcherKind?: string,
 *   resolveArgs?: any,
 *   resolveCwd?: any,
 *   resolveLogDir?: any,
 *   buildExitPayload?: any,
 *   closeErrorLabel: string,
 *   exitErrorLabel: string | ((payload: Record<string, unknown>) => string),
 * }} options Launcher dependencies.
 * @returns {{
 *   launch: (payload: {
 *     repoRoot: string,
 *     runId: string,
 *     prompt?: string,
 *     beadId?: string,
 *     beadTitle?: string | null,
 *     onExit?: (options: {
 *       runId: string,
 *       exitCode: number | null,
 *       signal: string | null
 *     }) => unknown
 *   }) => Promise<{
 *     launcherKind: string,
 *     command: string,
 *     args: string[],
 *     pid: number | null,
 *     stdoutPath: string,
 *     stderrPath: string
 *   }>
 * }} Launcher wrapper.
 */
export function createDetachedProcessLauncher(options) {
  const typedOptions = /** @type {any} */ (options);

  return {
    async launch(payload) {
      const args = resolveLaunchArgs(typedOptions, payload);
      const cwd = resolveLaunchCwd(typedOptions, payload);
      const logDir = resolveLaunchLogDir(typedOptions, payload);
      const exitErrorLabel = resolveLaunchExitErrorLabel(typedOptions, payload);
      let buildExitPayload;

      if (typeof typedOptions.buildExitPayload === 'function') {
        buildExitPayload = (
          /** @type {any} */ exitPayload,
          /** @type {any} */ input
        ) => typedOptions.buildExitPayload(/** @type {any} */ (payload), input);
      }

      return launchDetachedProcessWithRunLogs(
        /** @type {any} */ ({
          command: typedOptions.command,
          args,
          cwd,
          logDir,
          pathModule: typedOptions.pathModule,
          runId: payload.runId,
          mkdirImpl: typedOptions.mkdirImpl,
          openImpl: typedOptions.openImpl,
          spawnImpl: typedOptions.spawnImpl,
          onExit: /** @type {any} */ (payload.onExit),
          buildExitPayload,
          closeErrorLabel: typedOptions.closeErrorLabel,
          exitErrorLabel,
          launcherKind: typedOptions.launcherKind,
        })
      );
    },
  };
}
