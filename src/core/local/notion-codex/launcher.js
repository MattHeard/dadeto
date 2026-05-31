import { createDetachedProcessLauncher } from '../process-launcher.js';

/**
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   resolveArgs?: (payload: { repoRoot: string, runId: string, prompt: string, onExit?: (options: { runId: string, exitCode: number | null, signal: string | null }) => unknown }) => string[],
 *   mkdirImpl?: import('node:fs/promises').mkdir,
 *   openImpl?: import('node:fs/promises').open,
 *   spawnImpl?: import('node:child_process').spawn,
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
  return createDetachedProcessLauncher({
    ...options,
    logDirSuffix: 'notion-codex',
    closeErrorLabel: 'Failed to close Notion Codex run log handle:',
    exitErrorLabel: payload =>
      `Failed to handle Notion Codex exit for ${payload.runId}:`,
    resolveArgs: payload =>
      /** @type {string[]} */ ([
        ...(options.args ?? []),
        String(payload.prompt ?? ''),
      ]),
  });
}
