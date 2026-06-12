import {
  applyRunnerLaunch,
  applyRunnerLaunchFailure,
  applyRunnerOutcome,
} from '../symphony.js';
import { getDefinedStrings, getRecordOrNull } from '../commonCore.js';
import {
  createCodexRalphLauncher,
  DEFAULT_CODEX_RALPH_ARGS,
} from './launcherCodex.js';

/**
 * Launch the selected runner loop and persist the resulting status.
 * @param {{
 *   status: Record<string, unknown>,
 *   statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *   repoRoot?: string,
 *   cwd?: () => string,
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
 * }} options - Launch options for the runner loop.
 * @returns {Promise<Record<string, unknown>>} Updated launched-run status.
 */
export async function launchSelectedRunnerLoop(options) {
  const context = buildLaunchContext(options);
  await ensureLaunchable(context);
  return runLaunch(context);
}

/**
 * Build the launch context used across the runner lifecycle.
 * @param {{
 *   status: Record<string, unknown>,
 *   statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *   repoRoot?: string,
 *   cwd?: () => string,
 *   launcher?: {
 *     launchRunner: (payload: {
 *       repoRoot: string,
 *       beadId: string,
 *       beadTitle?: string | null,
 *       runId: string,
 *       onExit?: (exitInfo: { exitCode: number | null, signal: string | null }) => Promise<void>
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
 * }} options - Launch options for the runner loop.
 * @returns {{
 *   options: typeof options,
 *   now: () => Date,
 *   status: Record<string, unknown>,
 *   requestedBeadId: string | null,
 *   currentBeadTitle: string | null,
 *   currentBeadPriority: string | null,
 *   startedAt: string,
 *   failureBeadId: string,
 *   failureLaunchRequest: string,
 *   createInitialFailure: (error: string) => {
 *     status: Record<string, unknown>,
 *     startedAt: string,
 *     beadId: string,
 *     beadTitle: string | null,
 *     beadPriority: string | null,
 *     launchRequest: string,
 *     error: string
 *   }
 * }} Launch context.
 */
function buildLaunchContext(options) {
  const now = options.now ?? (() => new Date());
  const status = options.status;
  const requestedBeadId = getOptionalString(status.currentBeadId);
  const currentBeadTitle = getOptionalString(status.currentBeadTitle);
  const currentBeadPriority = getOptionalString(status.currentBeadPriority);
  const startedAt = now().toISOString();
  const failureBeadId = requestedBeadId ?? 'unknown-bead';
  const failureLaunchRequest = formatLaunchRequestForBead(requestedBeadId);

  return {
    options,
    now,
    status,
    requestedBeadId,
    currentBeadTitle,
    currentBeadPriority,
    startedAt,
    failureBeadId,
    failureLaunchRequest,
    createInitialFailure: error => ({
      status,
      startedAt,
      beadId: failureBeadId,
      beadTitle: currentBeadTitle,
      beadPriority: currentBeadPriority,
      launchRequest: failureLaunchRequest,
      error,
    }),
  };
}

/**
 * Ensure the runner can be launched from the current state.
 * @param {ReturnType<typeof buildLaunchContext>} context Launch context.
 * @returns {Promise<void>} Nothing.
 */
async function ensureLaunchable(context) {
  if (context.status.state === 'ready') {
    return;
  }

  const guardError = new Error(
    `Cannot launch runner loop unless Symphony is ready. Current state: ${String(
      context.status.state ?? 'unknown'
    )}.`
  );

  await persistInitialLaunchFailure(
    context.options,
    context.createInitialFailure(guardError.message)
  );

  throw guardError;
}

/**
 * Launch the configured runner and persist the resulting status.
 * @param {ReturnType<typeof buildLaunchContext>} context Launch context.
 * @returns {Promise<Record<string, unknown>>} Updated launched-run status.
 */
async function runLaunch(context) {
  let currentBeadId;
  try {
    currentBeadId = getRequiredString(context.requestedBeadId, 'currentBeadId');
  } catch (error) {
    const normalizedError = normalizeError(error);
    await persistInitialLaunchFailure(
      context.options,
      context.createInitialFailure(normalizedError.message)
    );

    throw normalizedError;
  }

  const launchRequest = formatLaunchRequestForBead(currentBeadId);
  const runId = `${context.startedAt}--${currentBeadId}`;
  const launcher =
    context.options.launcher ??
    createConfiguredLauncher(context.status, context.options);
  const launchStatusWrite = createDeferredPromise();
  const onRunnerExit = createRunnerExitHandler({
    statusStore: context.options.statusStore,
    runId,
    beadId: currentBeadId,
    beadTitle: context.currentBeadTitle,
    waitForLaunchStatusWrite: () => launchStatusWrite.promise,
  });

  try {
    const invocation = await launcher.launchRunner({
      repoRoot: context.options.repoRoot ?? context.options.cwd?.() ?? '',
      beadId: currentBeadId,
      beadTitle: context.currentBeadTitle,
      runId,
      onExit: onRunnerExit,
    });
    const launchedStatus = applyRunnerLaunch(context.status, {
      ...createLaunchMetadata(context, currentBeadId, launchRequest),
      launcherKind: invocation.launcherKind,
      command: invocation.command,
      args: invocation.args,
      pid: invocation.pid,
      stdoutPath: invocation.stdoutPath,
      stderrPath: invocation.stderrPath,
    });
    launchedStatus.operatorRecommendation =
      buildLaunchLifecycleRecommendation(launchedStatus);

    const writePromise =
      context.options.statusStore.writeStatus(launchedStatus);
    try {
      await writePromise;
    } finally {
      launchStatusWrite.resolve();
    }

    return launchedStatus;
  } catch (error) {
    launchStatusWrite.resolve();
    return persistLaunchFailure(context.options.statusStore, context.status, {
      ...createLaunchMetadata(context, currentBeadId, launchRequest),
      error: getLaunchErrorMessage(error),
    });
  }
}

/**
 * Build shared launch metadata for success and failure persistence.
 * @param {ReturnType<typeof buildLaunchContext>} context Launch context.
 * @param {string} beadId Current bead id.
 * @param {string} launchRequest Launch request label.
 * @returns {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   beadPriority: string | null,
 *   launchRequest: string
 * }} Shared launch metadata.
 */
function createLaunchMetadata(context, beadId, launchRequest) {
  return {
    runId: `${context.startedAt}--${beadId}`,
    startedAt: context.startedAt,
    beadId,
    beadTitle: context.currentBeadTitle,
    beadPriority: context.currentBeadPriority,
    launchRequest,
  };
}

/**
 * Persist an early Symphony launch failure before a run id exists.
 * @param {{ statusStore: any }} options Launch options.
 * @param {object} failure Failure payload.
 * @returns {Promise<Record<string, unknown>>} Persisted failure status.
 */
function persistInitialLaunchFailure(options, failure) {
  return persistLaunchFailure(options.statusStore, failure.status, {
    startedAt: failure.startedAt,
    beadId: failure.beadId,
    beadTitle: failure.beadTitle,
    beadPriority: failure.beadPriority,
    launchRequest: failure.launchRequest,
    error: failure.error,
  });
}

/**
 * @param {Record<string, unknown>} status Current launched Symphony status.
 * @returns {string} Operator-facing lifecycle guidance for the launched run.
 */
function buildLaunchLifecycleRecommendation(status) {
  const beadId = getRequiredString(status.currentBeadId, 'currentBeadId');
  const operatorArtifacts = getRecordOrNull(status.operatorArtifacts);
  const activeRun = getRecordOrNull(status.activeRun);
  const statusPath = getOptionalString(operatorArtifacts?.statusPath);
  const stdoutPath = getOptionalString(activeRun?.stdoutPath);
  const stderrPath = getOptionalString(activeRun?.stderrPath);
  const persistedArtifacts = getDefinedStrings(
    statusPath,
    stdoutPath,
    stderrPath
  );

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
 * @param {unknown} error Error-like value.
 * @returns {Error} Normalized error instance.
 */
function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
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
 * @param {{ repoRoot?: string, cwd?: () => string }} options Launch options.
 * @returns {{ launchRunner: ReturnType<typeof createCodexRalphLauncher>['launchRunner'] }} Configured launcher.
 */
function createConfiguredLauncher(status, options) {
  const launcherConfig = getLauncherConfig(status);

  return createCodexRalphLauncher({
    command: launcherConfig.command,
    args: launcherConfig.args,
    cwd: options.repoRoot ?? options.cwd?.() ?? '',
  });
}

/**
 * @param {Record<string, unknown>} status Current Symphony status.
 * @returns {{ command: string, args: string[] }} Launcher configuration.
 */
function getLauncherConfig(status) {
  let launcherConfig = null;
  if (status.config && typeof status.config === 'object') {
    launcherConfig = status.config.launcher;
  }

  return {
    command: getLauncherCommand(launcherConfig),
    args: getLauncherArgs(launcherConfig),
  };
}

/**
 * @param {unknown} launcherConfig Launcher config value.
 * @returns {string} Command to execute.
 */
function getLauncherCommand(launcherConfig) {
  if (
    launcherConfig &&
    typeof launcherConfig === 'object' &&
    typeof launcherConfig.command === 'string' &&
    launcherConfig.command.trim()
  ) {
    return launcherConfig.command.trim();
  }

  return 'codex';
}

/**
 * @param {unknown} launcherConfig Launcher config value.
 * @returns {string[]} Runner arguments.
 */
function getLauncherArgs(launcherConfig) {
  if (
    launcherConfig &&
    typeof launcherConfig === 'object' &&
    Array.isArray(launcherConfig.args)
  ) {
    return launcherConfig.args.filter(arg => typeof arg === 'string');
  }

  return [...DEFAULT_CODEX_RALPH_ARGS];
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
 * } | undefined | null} statusStore - Status store to persist into.
 * @param {Record<string, unknown>} status - Current Symphony status.
 * @param {{
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   error: string
 * }} failure - Failure payload.
 * @returns {Promise<Record<string, unknown>>} Persisted launched status.
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
 * }} options - Runner exit handler options.
 * @returns {((exitInfo: { exitCode: number | null, signal: string | null }) => Promise<void>) | undefined}
 *   Exit handler or undefined when status persistence is unavailable.
 */
export function createRunnerExitHandler(options) {
  if (
    !options.statusStore ||
    typeof options.statusStore.readStatus !== 'function' ||
    typeof options.statusStore.writeStatus !== 'function'
  ) {
    return undefined;
  }

  let waitForLaunchStatusWrite = null;
  if (typeof options.waitForLaunchStatusWrite === 'function') {
    waitForLaunchStatusWrite = options.waitForLaunchStatusWrite;
  }

  return async exitInfo => {
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
 * @returns {{ promise: Promise<void>, resolve: () => void }} Deferred promise pair.
 */
function createDeferredPromise() {
  let resolver = () => {};
  const promise = new Promise(resolve => {
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
 * }} input - Runner exit info.
 * @returns {{ beadId: string, beadTitle: string | null, outcome: 'completed' | 'blocked', summary: string }}
 *   Exit outcome payload.
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
    exitCode: input.exitCode,
    signal: input.signal,
  };
}

/**
 * @param {number | null} exitCode - Runner exit code.
 * @param {string | null} signal - Runner signal.
 * @returns {'completed' | 'blocked'} Outcome kind.
 */
function getRunnerExitOutcomeKind(exitCode, signal) {
  if (exitCode === 0 && !signal) {
    return 'completed';
  }

  return 'blocked';
}

/**
 * @param {{ runId: string, exitCode: number | null, signal: string | null }} input - Runner exit info.
 * @returns {string} Human-readable summary.
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

/**
 * Create the Symphony launch wrapper handle.
 * @returns {{
 *   launchSelectedRunnerLoop: typeof launchSelectedRunnerLoop,
 *   createRunnerExitHandler: typeof createRunnerExitHandler
 * }} Symphony launch exports.
 */
export function createSymphonyLaunchHandle() {
  return {
    launchSelectedRunnerLoop,
    createRunnerExitHandler,
  };
}
