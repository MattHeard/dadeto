import { createDetachedProcessLauncher } from '../process-launcher.js';

/**
 * @param {{
 *   command: string,
 *   args?: string[],
 *   cwd?: string,
 *   logDir?: string,
 *   logDirSuffix?: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
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
  /**
   * @param {Record<string, unknown>} payload Launcher payload.
   * @returns {string[]} Command arguments.
   */
  function resolveArgs(payload) {
    return buildResolveArgs(options, payload);
  }

  return createDetachedProcessLauncher({
    ...options,
    logDirSuffix: 'notion-codex',
    closeErrorLabel: 'Failed to close Notion Codex run log handle:',
    exitErrorLabel: buildExitErrorLabel,
    resolveArgs,
  });
}

/**
 * @param {Record<string, unknown>} payload Launcher exit payload.
 * @returns {string} Error label.
 */
function buildExitErrorLabel(payload) {
  return `Failed to handle Notion Codex exit for ${payload.runId}:`;
}

/**
 * @param {{ args?: string[] }} options Launcher options.
 * @param {Record<string, unknown>} payload Launcher payload.
 * @returns {string[]} Command arguments.
 */
function buildResolveArgs(options, payload) {
  return /** @type {string[]} */ ([
    ...(options.args ?? []),
    String(payload.prompt ?? ''),
  ]);
}
