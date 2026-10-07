import * as processLauncher from '../process-launcher.js';

/**
 * Compose Notion's lifecycle policy with the shared detached-process launcher.
 * @param {Parameters<typeof processLauncher.createDetachedProcessLauncher>[0]} options Launcher dependencies.
 * @returns {ReturnType<typeof processLauncher.createDetachedProcessLauncher>} Notion process lifecycle.
 */
export function createNotionCodexLauncherCore(options) {
  return processLauncher.createDetachedProcessLauncher(
    /** @type {Parameters<typeof processLauncher.createDetachedProcessLauncher>[0]} */ ({
      ...options,
      logDirSuffix: 'notion-codex',
      closeErrorLabel: 'Failed to close Notion Codex run log handle:',
      exitErrorLabel: buildExitErrorLabel,
      resolveArgs: undefined,
    })
  );
}

/**
 * @param {Record<string, unknown>} payload Launcher exit payload.
 * @returns {string} Error label.
 */
function buildExitErrorLabel(payload) {
  return `Failed to handle Notion Codex exit for ${payload.runId}:`;
}
