import { createDetachedProcessLauncher } from '../process-launcher.js';

/**
 * Compose Notion's lifecycle policy with the shared detached-process launcher.
 * @param {{command: string} & Partial<Parameters<typeof createDetachedProcessLauncher>[0]>} options Launcher dependencies.
 * @returns {ReturnType<typeof createDetachedProcessLauncher>} Notion process lifecycle.
 */
export function createNotionCodexLauncherCore(options) {
  return createDetachedProcessLauncher(
    /** @type {Parameters<typeof createDetachedProcessLauncher>[0]} */ ({
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
