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
export function createNotionCodexLauncher(options) {
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
        logDir: options.logDir ?? path.join(payload.repoRoot, 'tracking', 'notion-codex'),
        runId: payload.runId,
        mkdirImpl,
        openImpl,
      });

      let child;
      try {
        child = spawnImpl(options.command, args, {
          cwd: options.cwd ?? payload.repoRoot,
          detached: true,
          stdio: ['ignore', stdoutFd, stderrFd],
        });
      } finally {
        await closeRunLogHandles({ stdoutHandle, stderrHandle });
      }

      if (typeof payload.onExit === 'function') {
        child.once('exit', (code, signal) => {
          Promise.resolve(
            payload.onExit({
              runId: payload.runId,
              exitCode: typeof code === 'number' ? code : null,
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
        pid: typeof child.pid === 'number' ? child.pid : null,
        stdoutPath,
        stderrPath,
      };
    },
  };
}

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
      console.error('Failed to close Notion Codex run log handle:', result.reason);
    }
  }
}
