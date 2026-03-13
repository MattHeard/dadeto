import {
  applyRunnerLaunch,
  applyRunnerLaunchFailure,
  applyRunnerOutcome,
} from '../../core/local/symphony.js';
import {
  createCodexRalphLauncher,
  DEFAULT_CODEX_RALPH_ARGS,
} from './launcherCodex.js';

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
 *       pid?: number | null,
 *       stdoutPath?: string | null,
 *       stderrPath?: string | null
 *     }>
 *   },
 *   now?: () => Date
 * }} options
 * @returns {Promise<Record<string, unknown>>} Updated launched-run status.
 */
export async function launchSelectedRunnerLoop(options) {
  const now = options.now ?? (() => new Date());
  const status = options.status;
  const requestedBeadId = getOptionalString(status.currentBeadId);
  const currentBeadTitle = getOptionalString(status.currentBeadTitle);
  const currentBeadPriority = getOptionalString(status.currentBeadPriority);
  const startedAt = now().toISOString();
  const failureBeadId = requestedBeadId ?? 'unknown-bead';
  const failureLaunchRequest = formatLaunchRequestForBead(requestedBeadId);

  if (status.state !== 'ready') {
    const guardError = new Error(
      `Cannot launch runner loop unless Symphony is ready. Current state: ${String(
        status.state ?? 'unknown'
      )}.`
    );

    await persistLaunchFailure(options.statusStore, status, {
      startedAt,
      beadId: failureBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest: failureLaunchRequest,
      error: guardError.message,
    });

    throw guardError;
  }

  let currentBeadId;
  try {
    currentBeadId = getRequiredString(requestedBeadId, 'currentBeadId');
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    await persistLaunchFailure(options.statusStore, status, {
      startedAt,
      beadId: failureBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest: failureLaunchRequest,
      error: normalizedError.message,
    });

    throw normalizedError;
  }

  const launchRequest = formatLaunchRequestForBead(currentBeadId);
  const runId = `${startedAt}--${currentBeadId}`;
  const launcher = options.launcher ?? createConfiguredLauncher(status, options);
  const launchStatusWrite = createDeferredPromise();
  const onRunnerExit = createRunnerExitHandler({
    statusStore: options.statusStore,
    runId,
    beadId: currentBeadId,
    beadTitle: currentBeadTitle,
    waitForLaunchStatusWrite: () => launchStatusWrite.promise,
  });

  try {
    const invocation = await launcher.launchRunner({
      repoRoot: options.repoRoot ?? process.cwd(),
      beadId: currentBeadId,
      beadTitle: currentBeadTitle,
      runId,
      onExit: onRunnerExit,
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
      stdoutPath: invocation.stdoutPath,
      stderrPath: invocation.stderrPath,
    });
    launchedStatus.operatorRecommendation = buildLaunchLifecycleRecommendation(
      launchedStatus
    );

    const writePromise = options.statusStore.writeStatus(launchedStatus);
    try {
      await writePromise;
    } finally {
      launchStatusWrite.resolve();
    }

    return launchedStatus;
  } catch (error) {
    launchStatusWrite.resolve();
    const failedStatus = await persistLaunchFailure(options.statusStore, status, {
      startedAt,
      beadId: currentBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest,
      error: getLaunchErrorMessage(error),
    });

    return failedStatus;
  }
}

/**
 * @param {Record<string, unknown>} status Current launched Symphony status.
 * @returns {string} Operator-facing lifecycle guidance for the launched run.
 */
function buildLaunchLifecycleRecommendation(status) {
  const beadId = getRequiredString(status.currentBeadId, 'currentBeadId');
  const operatorArtifacts =
    status.operatorArtifacts && typeof status.operatorArtifacts === 'object'
      ? status.operatorArtifacts
      : null;
  const activeRun =
    status.activeRun && typeof status.activeRun === 'object' ? status.activeRun : null;
  const statusPath = getOptionalString(operatorArtifacts?.statusPath);
  const stdoutPath = getOptionalString(activeRun?.stdoutPath);
  const stderrPath = getOptionalString(activeRun?.stderrPath);
  const persistedArtifacts = [statusPath, stdoutPath, stderrPath].filter(Boolean);

  if (persistedArtifacts.length === 0) {
    return `Wait for the runner loop on ${beadId} to finish before launching another bead.`;
  }

  return [
    `Wait for the runner loop on ${beadId} to finish before launching another bead.`,
    'The launched Ralph process is detached and may continue even if the Symphony server stops.',
    `If the server is unavailable, inspect ${persistedArtifacts.join(', ')}.`,
  ].join(' ');
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
        : [...DEFAULT_CODEX_RALPH_ARGS],
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

/**
 * @param {string | null} beadId Candidate bead id.
 * @returns {string} Launch request text for logging.
 */
function formatLaunchRequestForBead(beadId) {
  if (typeof beadId === 'string' && beadId.trim()) {
    return `pop ${beadId}`;
  }

  return 'pop <missing bead id>';
}

/**
 * @param {{
 *   writeStatus: (status: Record<string, unknown>) => Promise<void>
 * } | undefined | null} statusStore
 * @param {Record<string, unknown>} status
 * @param {{
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   error: string
 * }} failure
 * @returns {Promise<Record<string, unknown>>}
 */
async function persistLaunchFailure(statusStore, status, failure) {
  if (!statusStore || typeof statusStore.writeStatus !== 'function') {
    return applyRunnerLaunchFailure(status, failure);
  }

  const failedStatus = applyRunnerLaunchFailure(status, failure);
  await statusStore.writeStatus(failedStatus);
  return failedStatus;
}

/**
 * @param {{
 *   statusStore: {
 *     readStatus: () => Promise<Record<string, unknown> | null>,
 *     writeStatus: (status: Record<string, unknown>) => Promise<void>
 *   },
 *   runId: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   waitForLaunchStatusWrite?: () => Promise<void>
 * }} options
 * @returns {((exitInfo: { exitCode: number | null, signal: string | null }) => Promise<void>) | undefined}
 */
export function createRunnerExitHandler(options) {
  if (
    !options.statusStore ||
    typeof options.statusStore.readStatus !== 'function' ||
    typeof options.statusStore.writeStatus !== 'function'
  ) {
    return undefined;
  }

  const waitForLaunchStatusWrite =
    typeof options.waitForLaunchStatusWrite === 'function'
      ? options.waitForLaunchStatusWrite
      : null;

  return async (exitInfo) => {
    if (waitForLaunchStatusWrite) {
      try {
        await waitForLaunchStatusWrite();
      } catch (waitError) {
        console.error(
          `Failed to wait for the launch status write before handling runner ${options.runId} exit:`,
          waitError
        );
      }
    }

    try {
      const storedStatus = await options.statusStore.readStatus();
      if (!storedStatus) {
        console.warn(
          `Symphony status missing when runner ${options.runId} exited; skipping update.`
        );
        return;
      }

      const outcome = buildRunnerExitOutcome({
        runId: options.runId,
        beadId: options.beadId,
        beadTitle: options.beadTitle,
        exitCode: exitInfo.exitCode,
        signal: exitInfo.signal,
      });

      const updatedStatus = applyRunnerOutcome(storedStatus, outcome);
      await options.statusStore.writeStatus(updatedStatus);
    } catch (error) {
      console.error(
        `Failed to persist Symphony status after runner ${options.runId} exit:`,
        error
      );
    }
  };
}

/**
 * @returns {{ promise: Promise<void>, resolve: () => void }}
 */
function createDeferredPromise() {
  let resolver = () => {};
  const promise = new Promise((resolve) => {
    resolver = resolve;
  });
  return {
    promise,
    resolve: () => {
      resolver();
      resolver = () => {};
    },
  };
}

/**
 * @param {{
 *   runId: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   exitCode: number | null,
 *   signal: string | null
 * }} input
 * @returns {{ beadId: string, beadTitle: string | null, outcome: 'completed' | 'blocked', summary: string }}
 */
function buildRunnerExitOutcome(input) {
  const outcomeKind = getRunnerExitOutcomeKind(input.exitCode, input.signal);
  return {
    beadId: input.beadId,
    beadTitle: input.beadTitle ?? null,
    outcome: outcomeKind,
    summary: formatRunnerExitSummary({
      runId: input.runId,
      exitCode: input.exitCode,
      signal: input.signal,
    }),
  };
}

/**
 * @param {number | null} exitCode
 * @param {string | null} signal
 * @returns {'completed' | 'blocked'}
 */
function getRunnerExitOutcomeKind(exitCode, signal) {
  if (exitCode === 0 && !signal) {
    return 'completed';
  }

  return 'blocked';
}

/**
 * @param {{ runId: string, exitCode: number | null, signal: string | null }} input
 * @returns {string}
 */
function formatRunnerExitSummary(input) {
  if (typeof input.signal === 'string' && input.signal) {
    return `Runner ${input.runId} terminated with signal ${input.signal}.`;
  }

  if (typeof input.exitCode === 'number') {
    return `Runner ${input.runId} exited with code ${input.exitCode}.`;
  }

  return `Runner ${input.runId} exited.`;
}
