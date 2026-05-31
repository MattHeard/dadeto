// @ts-nocheck
import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir, open } from 'node:fs/promises';

/**
 * Open append-only run log files for a spawned process.
 * @param {{
 *   logDir: string,
 *   runId: string,
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
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;
  const runsDir = path.join(options.logDir, 'runs');
  await mkdirImpl(runsDir, { recursive: true });

  const baseName = options.runId.replaceAll(':', '-');
  const stdoutPath = path.join(runsDir, `${baseName}--stdout.log`);
  const stderrPath = path.join(runsDir, `${baseName}--stderr.log`);
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
 * Launch a detached process with append-only logs and an optional exit handler.
 * @param {{
 *   command: string,
 *   args: string[],
 *   repoRoot: string,
 *   runId: string,
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   mkdirImpl?: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   openImpl?: (filePath: string, flags: 'a') => Promise<{ fd: number, close?: () => Promise<void> | void }>,
 *   spawnImpl?: (command: string, args: string[], options: { cwd: string, detached: true, stdio: ['ignore', number, number] }) => { pid?: number, once?: (event: string, handler: (code: number | null, signal: string | null) => unknown) => void, unref?: () => void },
 *   onExit?: (payload: { runId: string, exitCode: number | null, signal: string | null }) => unknown,
 *   buildExitPayload?: (input: { runId: string, exitCode: number | null, signal: string | null }) => { runId: string, exitCode: number | null, signal: string | null },
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
  const spawnImpl = options.spawnImpl ?? spawn;
  const logDir =
    options.logDir ??
    path.join(options.repoRoot, 'tracking', options.logDirSuffix ?? 'launcher');

  const {
    stdoutPath,
    stderrPath,
    stdoutFd,
    stderrFd,
    stdoutHandle,
    stderrHandle,
  } = await openAppendOnlyRunLogFiles({
    logDir,
    runId: options.runId,
    mkdirImpl: options.mkdirImpl,
    openImpl: options.openImpl,
  });

  let child;
  try {
    child = spawnImpl(options.command, options.args, {
      cwd: options.cwd ?? options.repoRoot,
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
    child.once('exit', (code, signal) => {
      const exitPayload = options.buildExitPayload
        ? options.buildExitPayload({
            runId: options.runId,
            exitCode: typeof code === 'number' ? code : null,
            signal: signal ?? null,
          })
        : {
            runId: options.runId,
            exitCode: typeof code === 'number' ? code : null,
            signal: signal ?? null,
          };

      Promise.resolve(options.onExit(exitPayload)).catch(error => {
        console.error(options.exitErrorLabel, error);
      });
    });
  }

  child.unref();

  return {
    launcherKind: options.launcherKind ?? 'codex',
    command: options.command,
    args: options.args,
    pid: typeof child.pid === 'number' ? child.pid : null,
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
 *   mkdirImpl?: typeof mkdir,
 *   openImpl?: typeof open,
 *   spawnImpl?: typeof spawn,
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
  const spawnImpl = options.spawnImpl ?? spawn;
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;

  return {
    async launch(payload) {
      const args = options.resolveArgs
        ? options.resolveArgs(payload)
        : [...(options.args ?? []), payload.prompt];
      const cwd = options.resolveCwd
        ? options.resolveCwd(payload)
        : (options.cwd ?? payload.repoRoot);
      const logDir = options.resolveLogDir
        ? options.resolveLogDir(payload)
        : (options.logDir ??
          path.join(
            payload.repoRoot,
            'tracking',
            options.logDirSuffix ?? 'launcher'
          ));
      const exitErrorLabel =
        typeof options.exitErrorLabel === 'function'
          ? options.exitErrorLabel(payload)
          : options.exitErrorLabel;

      return launchDetachedProcessWithRunLogs({
        command: options.command,
        args,
        cwd,
        logDir,
        runId: payload.runId,
        mkdirImpl,
        openImpl,
        spawnImpl,
        onExit: payload.onExit,
        buildExitPayload: options.buildExitPayload
          ? input => options.buildExitPayload(payload, input)
          : undefined,
        closeErrorLabel: options.closeErrorLabel,
        exitErrorLabel,
        launcherKind: options.launcherKind,
      });
    },
  };
}
