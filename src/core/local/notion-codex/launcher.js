import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir, open } from 'node:fs/promises';

/**
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   mkdirImpl?: typeof mkdir,
 *   openImpl?: typeof open,
 *   spawnImpl?: typeof spawn
 * }} options Launcher dependencies.
 * @returns {{
 *   launch: (payload: {
 *     repoRoot: string,
 *     runId: string,
 *     prompt: string,
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
 * }} Local Codex launcher for Notion poll runs.
 */
export function createNotionCodexLauncherCore(options) {
  const spawnImpl = options.spawnImpl ?? spawn;
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;

  return {
    async launch(payload) {
      const args = [...(options.args ?? []), payload.prompt];
      const {
        stdoutPath,
        stderrPath,
        stdoutFd,
        stderrFd,
        stdoutHandle,
        stderrHandle,
      } = await openRunLogFiles({
        logDir: getLogDir(options.logDir, payload.repoRoot),
        runId: payload.runId,
        mkdirImpl,
        openImpl,
      });

      let child;
      try {
        child = spawnImpl(options.command, args, {
          cwd: getWorkingDirectory(options.cwd, payload.repoRoot),
          detached: true,
          stdio: ['ignore', stdoutFd, stderrFd],
        });
      } finally {
        await closeRunLogHandles({ stdoutHandle, stderrHandle });
      }

      const onExit = payload.onExit;
      if (typeof onExit === 'function') {
        child.once('exit', (code, signal) => {
          Promise.resolve(
            onExit({
              runId: payload.runId,
              exitCode: getExitCode(code),
              signal: signal ?? null,
            })
          ).catch(error => {
            console.error(
              `Failed to handle Notion Codex exit for ${payload.runId}:`,
              error
            );
          });
        });
      }

      child.unref();

      return {
        launcherKind: 'codex',
        command: options.command,
        args,
        pid: getChildPid(child),
        stdoutPath,
        stderrPath,
      };
    },
  };
}

/**
 * Open the append-only run log files.
 * @param {{
 *   logDir: string,
 *   runId: string,
 *   mkdirImpl: typeof mkdir,
 *   openImpl: typeof open
 * }} options Open-file dependencies.
 * @returns {Promise<{
 *   stdoutPath: string,
 *   stderrPath: string,
 *   stdoutFd: number,
 *   stderrFd: number,
 *   stdoutHandle: { close?: () => Promise<void> | void },
 *   stderrHandle: { close?: () => Promise<void> | void }
 * }>} Opened append-only run log files.
 */
async function openRunLogFiles(options) {
  const runsDir = path.join(options.logDir, 'runs');
  await options.mkdirImpl(runsDir, { recursive: true });

  const baseName = options.runId.replaceAll(':', '-');
  const stdoutPath = path.join(runsDir, `${baseName}--stdout.log`);
  const stderrPath = path.join(runsDir, `${baseName}--stderr.log`);
  const [stdoutHandle, stderrHandle] = await Promise.all([
    options.openImpl(stdoutPath, 'a'),
    options.openImpl(stderrPath, 'a'),
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
 * @returns {Promise<void>} Nothing.
 */
async function closeRunLogHandles({ stdoutHandle, stderrHandle }) {
  const closers = [];

  if (stdoutHandle && typeof stdoutHandle.close === 'function') {
    closers.push(stdoutHandle.close());
  }

  if (stderrHandle && typeof stderrHandle.close === 'function') {
    closers.push(stderrHandle.close());
  }

  if (closers.length === 0) {
    return;
  }

  const results = await Promise.allSettled(closers);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        'Failed to close Notion Codex run log handle:',
        result.reason
      );
    }
  }
}

/**
 * Resolve the run log directory.
 * @param {string | undefined} logDir Configured log directory.
 * @param {string} repoRoot Repository root.
 * @returns {string} Log directory.
 */
function getLogDir(logDir, repoRoot) {
  if (typeof logDir === 'string' && logDir) {
    return logDir;
  }

  return path.join(repoRoot, 'tracking', 'notion-codex');
}

/**
 * Resolve the working directory for the spawned process.
 * @param {string | undefined} cwd Configured working directory.
 * @param {string} repoRoot Repository root.
 * @returns {string} Working directory.
 */
function getWorkingDirectory(cwd, repoRoot) {
  if (typeof cwd === 'string' && cwd) {
    return cwd;
  }

  return repoRoot;
}

/**
 * Read the spawned child PID.
 * @param {{ pid?: number }} child Spawned child process.
 * @returns {number | null} PID or null.
 */
function getChildPid(child) {
  if (typeof child.pid === 'number') {
    return child.pid;
  }

  return null;
}

/**
 * Normalize a child exit code.
 * @param {unknown} code Child exit code.
 * @returns {number | null} Exit code or null.
 */
function getExitCode(code) {
  if (typeof code === 'number') {
    return code;
  }

  return null;
}
