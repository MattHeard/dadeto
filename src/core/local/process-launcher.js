import { normalizeMaybeNumber } from '../commonCore.js';
/**
 * Open append-only run log files for a spawned process.
 * @param {{
 *   logDir: string,
 *   runId: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
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
  const mkdirImpl = options.mkdirImpl;
  const openImpl = options.openImpl;
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
  /** @type {Promise<void>[]} */
  const closers = [];

  if (
    handles.stdoutHandle &&
    typeof handles.stdoutHandle.close === 'function'
  ) {
    closers.push(Promise.resolve(handles.stdoutHandle.close()));
  }

  if (
    handles.stderrHandle &&
    typeof handles.stderrHandle.close === 'function'
  ) {
    closers.push(Promise.resolve(handles.stderrHandle.close()));
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
    return options.resolveArgs(payload);
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
    return options.resolveCwd(payload);
  }

  return options.cwd ?? String(payload.repoRoot ?? '');
}

/**
 * Resolve the log directory for a launch.
 * @param {{
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   resolveLogDir?: (payload: Record<string, unknown>) => string,
 * }} options Launcher options.
 * @param {Record<string, unknown>} payload Launch payload.
 * @returns {string} Launch log directory.
 */
function resolveLaunchLogDir(options, payload) {
  if (typeof options.resolveLogDir === 'function') {
    return options.resolveLogDir(payload);
  }

  if (options.logDir) {
    return options.logDir;
  }

  return options.pathModule.join(
    String(payload.repoRoot ?? ''),
    'tracking',
    options.logDirSuffix ?? 'launcher'
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
    return options.exitErrorLabel(payload);
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
  const normalizedExitCode = normalizeMaybeNumber(code);
  const normalizedSignal = signal ?? null;

  if (typeof options.buildExitPayload === 'function') {
    return options.buildExitPayload(payload, {
      runId: String(payload.runId),
      exitCode: normalizedExitCode,
      signal: normalizedSignal,
    });
  }

  return {
    runId: String(payload.runId),
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
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
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
  const spawnImpl =
    options.spawnImpl ??
    (() => {
      throw new Error('spawnImpl is required');
    });
  const logDir =
    options.logDir ??
    options.pathModule.join(
      options.repoRoot,
      'tracking',
      options.logDirSuffix ?? 'launcher'
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
    runId: options.runId,
    mkdirImpl: options.mkdirImpl,
    openImpl: options.openImpl,
  });

  /** @type {{ pid?: number, once: (event: string, listener: (code: number | null, signal: string | null) => void) => void, unref: () => void }} */
  let child;
  try {
    child = /** @type {typeof child} */ (
      spawnImpl(options.command, options.args, {
        cwd: options.cwd ?? options.repoRoot,
        detached: true,
        stdio: ['ignore', stdoutFd, stderrFd],
      })
    );
  } finally {
    await closeRunLogHandles(
      { stdoutHandle, stderrHandle },
      options.closeErrorLabel
    );
  }

  if (typeof options.onExit === 'function') {
    const onExit = options.onExit;
    child.once('exit', (code, signal) => {
      const exitPayload = resolveExitPayload(
        options,
        { runId: options.runId },
        code,
        signal
      );

      Promise.resolve(onExit(exitPayload)).catch(error => {
        console.error(options.exitErrorLabel, error);
      });
    });
  }

  child.unref();

  return {
    launcherKind: options.launcherKind ?? 'codex',
    command: options.command,
    args: options.args,
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
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
 *   spawnImpl: (command: string, args: string[], options: object) => { pid?: number, once: (event: string, listener: (code: number | null, signal: string | null) => void) => void, unref: () => void },
 *   launcherKind?: string,
 *   resolveArgs?: (payload: Record<string, unknown>) => string[],
 *   resolveCwd?: (payload: Record<string, unknown>) => string,
 *   resolveLogDir?: (payload: Record<string, unknown>) => string,
 *   buildExitPayload?: (payload: Record<string, unknown>, input: { runId: string, exitCode: number | null, signal: string | null }) => { runId: string, exitCode: number | null, signal: string | null },
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
  return {
    async launch(payload) {
      const args = resolveLaunchArgs(options, payload);
      const cwd = resolveLaunchCwd(options, payload);
      const logDir = resolveLaunchLogDir(options, payload);
      const exitErrorLabel = resolveLaunchExitErrorLabel(options, payload);
      /** @type {typeof options.buildExitPayload | undefined} */
      let buildExitPayload;

      if (typeof options.buildExitPayload === 'function') {
        const buildExitPayloadFn = options.buildExitPayload;
        buildExitPayload = (_exitPayload, input) =>
          buildExitPayloadFn(payload, input);
      }

      return launchDetachedProcessWithRunLogs({
        command: options.command,
        args,
        cwd,
        repoRoot: payload.repoRoot,
        logDir,
        pathModule: options.pathModule,
        runId: payload.runId,
        mkdirImpl: options.mkdirImpl,
        openImpl: options.openImpl,
        spawnImpl: options.spawnImpl,
        onExit: payload.onExit,
        buildExitPayload,
        closeErrorLabel: options.closeErrorLabel,
        exitErrorLabel,
        launcherKind: options.launcherKind,
      });
    },
  };
}
