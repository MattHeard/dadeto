import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir, open } from 'node:fs/promises';

// Keep Ralph launches cheap and bounded while still allowing a single bead loop
// to edit files and run local checks inside the repo workspace.
export const DEFAULT_CODEX_RALPH_ARGS = [
  'exec',
  '--skip-git-repo-check',
  '--model',
  'gpt-5.4-mini',
  '--sandbox',
  'workspace-write',
];

/**
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   mkdirImpl?: typeof mkdir,
 *   openImpl?: typeof open,
 *   spawnImpl?: typeof spawn
 * }} options
 * @returns {{
 *   launchRunner: (payload: {
 *     repoRoot: string,
 *     beadId: string,
 *     beadTitle?: string | null,
 *     runId: string
 *     onExit?: (options: {
 *       runId: string,
 *       beadId: string,
 *       beadTitle: string | null,
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
 * }} Local Codex-backed Ralph launcher.
 */
export function createCodexRalphLauncher(options) {
  const spawnImpl = options.spawnImpl ?? spawn;
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const openImpl = options.openImpl ?? open;

  return {
    async launchRunner(payload) {
      const prompt = buildRalphPrompt(payload);
      const args = [...(options.args ?? []), prompt];
      const {
        stdoutPath,
        stderrPath,
        stdoutFd,
        stderrFd,
        stdoutHandle,
        stderrHandle,
      } = await openRunLogFiles({
        logDir: options.logDir ?? path.join(payload.repoRoot, 'tracking', 'symphony'),
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
          const exitPayload = {
            runId: payload.runId,
            beadId: payload.beadId,
            beadTitle: payload.beadTitle ?? null,
            exitCode: typeof code === 'number' ? code : null,
            signal: signal ?? null,
          };

          Promise.resolve(payload.onExit(exitPayload)).catch((error) => {
            console.error(
              `Failed to handle Symphony runner exit for ${payload.runId}:`,
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

/**
 * @param {{
 *   beadId: string,
 *   beadTitle?: string | null,
 *   runId: string
 * }} payload Ralph launch payload.
 * @returns {string} Prompt passed to the Codex runner session.
 */
function buildRalphPrompt(payload) {
  const lines = [
    'you are ralph',
    'run exactly one bounded bead loop as the repo runner',
    'keep terminal usage terse and evidence-driven',
    'prefer focused rg/sed reads over broad scans or large file dumps',
    'if blocked or partial, leave bead evidence and stop instead of widening scope',
    `pop ${payload.beadId}`,
  ];
  if (payload.beadTitle) {
    lines.push(`bead title: ${payload.beadTitle}`);
  }
  lines.push(`run id: ${payload.runId}`);

  return lines.join('\n');
}

/**
 * @param {{
 *   logDir: string,
 *   runId: string,
 *   mkdirImpl: typeof mkdir,
 *   openImpl: typeof open
 * }} options
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
 * @param {{
 *   stdoutHandle?: { close?: () => Promise<void> | void },
 *   stderrHandle?: { close?: () => Promise<void> | void }
 * }} handles
 * @returns {Promise<void>}
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
      console.error('Failed to close run log handle:', result.reason);
    }
  }
}
