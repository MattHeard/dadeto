import {
  applyRunnerLaunch,
  applyRunnerLaunchFailure,
} from '../../core/local/symphony.js';
import { createCodexRalphLauncher } from './launcherCodex.js';

/**
 * @param {{
 *   status: Record<string, unknown>,
 *   statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *   repoRoot?: string,
 *   launcher?: {
 *     launchRunner: (payload: {
 *       repoRoot: string,
 *       beadId: string,
 *       beadTitle?: string | null,
 *       runId: string
 *     }) => Promise<{
 *       launcherKind?: string | null,
 *       command?: string | null,
 *       args?: string[] | null,
 *       pid?: number | null
 *     }>
 *   },
 *   now?: () => Date
 * }} options
 * @returns {Promise<Record<string, unknown>>} Updated launched-run status.
 */
export async function launchSelectedRunnerLoop(options) {
  const now = options.now ?? (() => new Date());
  const status = options.status;
  const currentBeadId = getRequiredString(status.currentBeadId, 'currentBeadId');
  const currentBeadTitle = getOptionalString(status.currentBeadTitle);
  const currentBeadPriority = getOptionalString(status.currentBeadPriority);

  if (status.state !== 'ready') {
    throw new Error(
      `Cannot launch runner loop unless Symphony is ready. Current state: ${String(status.state ?? 'unknown')}.`
    );
  }

  const startedAt = now().toISOString();
  const runId = `${startedAt}--${currentBeadId}`;
  const launchRequest = `pop ${currentBeadId}`;
  const launcher = options.launcher ?? createConfiguredLauncher(status, options);

  try {
    const invocation = await launcher.launchRunner({
      repoRoot: options.repoRoot ?? process.cwd(),
      beadId: currentBeadId,
      beadTitle: currentBeadTitle,
      runId,
    });
    const launchedStatus = applyRunnerLaunch(status, {
      runId,
      startedAt,
      beadId: currentBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest,
      launcherKind: invocation.launcherKind,
      command: invocation.command,
      args: invocation.args,
      pid: invocation.pid,
    });

    await options.statusStore.writeStatus(launchedStatus);

    return launchedStatus;
  } catch (error) {
    const failedStatus = applyRunnerLaunchFailure(status, {
      startedAt,
      beadId: currentBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest,
      error: getLaunchErrorMessage(error),
    });

    await options.statusStore.writeStatus(failedStatus);

    return failedStatus;
  }
}

/**
 * @param {unknown} value Candidate string value.
 * @returns {string | null} Trimmed string or null.
 */
function getOptionalString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return value.trim();
}

/**
 * @param {unknown} value Candidate string value.
 * @param {string} fieldName Field name for the error message.
 * @returns {string} Trimmed required string.
 */
function getRequiredString(value, fieldName) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    throw new Error(`Cannot launch runner loop without ${fieldName}.`);
  }

  return normalized;
}

/**
 * @param {Record<string, unknown>} status Current Symphony status.
 * @param {{ repoRoot?: string }} options Launch options.
 * @returns {{ launchRunner: ReturnType<typeof createCodexRalphLauncher>['launchRunner'] }} Configured launcher.
 */
function createConfiguredLauncher(status, options) {
  const launcherConfig = getLauncherConfig(status);

  return createCodexRalphLauncher({
    command: launcherConfig.command,
    args: launcherConfig.args,
    cwd: options.repoRoot ?? process.cwd(),
  });
}

/**
 * @param {Record<string, unknown>} status Current Symphony status.
 * @returns {{ command: string, args: string[] }} Launcher configuration.
 */
function getLauncherConfig(status) {
  const launcherConfig =
    status.config && typeof status.config === 'object'
      ? status.config.launcher
      : null;

  return {
    command:
      launcherConfig &&
      typeof launcherConfig === 'object' &&
      typeof launcherConfig.command === 'string' &&
      launcherConfig.command.trim()
        ? launcherConfig.command.trim()
        : 'codex',
    args:
      launcherConfig &&
      typeof launcherConfig === 'object' &&
      Array.isArray(launcherConfig.args)
        ? launcherConfig.args.filter(arg => typeof arg === 'string')
        : ['exec', '--skip-git-repo-check', '--full-auto'],
  };
}

/**
 * @param {unknown} error Launch error value.
 * @returns {string} User-visible launch failure message.
 */
function getLaunchErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown launcher failure.';
}
