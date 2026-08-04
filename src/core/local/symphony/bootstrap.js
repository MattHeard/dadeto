import {
  buildSelectedBeadStatus,
  summarizePollResult,
  summarizeTrackerSelection,
} from '../symphony.js';

/**
 * Create the bootstrap workflow.
 * @param {unknown} deps Runtime dependencies.
 * @returns {(...args: unknown[]) => unknown} Bootstrap function.
 */
function createBootstrapSymphony(deps) {
  /**
   * @param {unknown} options Bootstrap options.
   * @returns {Promise<unknown>} Bootstrap result.
   */
  return async function bootstrapSymphony(options = {}) {
    const snapshot = await buildSymphonyStatusSnapshot(options, deps);
    const statusStoreFactory =
      options.statusStoreFactory ?? deps.createSymphonyStatusStore;
    const statusStore = statusStoreFactory({
      statusPath: snapshot.config.statusPath,
      logDir: snapshot.config.logDir,
    });

    await statusStore.writeStatus(snapshot.status);

    return { status: snapshot.status, statusStore };
  };
}

/**
 * Create the refresh workflow.
 * @param {unknown} deps Runtime dependencies.
 * @returns {(...args: unknown[]) => unknown} Refresh function.
 */
function createRefreshSymphonyStatus(deps) {
  /**
   * @param {unknown} options Refresh options.
   * @returns {Promise<unknown>} Refreshed snapshot.
   */
  return async function refreshSymphonyStatus(options = {}) {
    if (
      !options.statusStore ||
      typeof options.statusStore.writeStatus !== 'function'
    ) {
      throw new Error('Symphony refresh requires a writable status store.');
    }

    const previousStatus = await readPreviousStatus(options.statusStore);
    const snapshot = await buildSymphonyStatusSnapshot(
      {
        ...options,
        previousStatus,
      },
      deps
    );
    await options.statusStore.writeStatus(snapshot.status);

    return snapshot;
  };
}

/**
 * Read an existing status when the store supports it.
 * @param {unknown} statusStore Status store.
 * @returns {Promise<unknown>} Previous status.
 */
async function readPreviousStatus(statusStore) {
  if (statusStore && typeof statusStore.readStatus === 'function') {
    return statusStore.readStatus();
  }

  return null;
}

/**
 * Poll ready beads when the workflow exists.
 * @param {unknown} workflow Workflow descriptor.
 * @param {unknown} tracker Tracker dependency.
 * @param {string} readyCommand Ready command.
 * @returns {Promise<unknown>} Poll result.
 */
async function getPollResult(workflow, tracker, readyCommand) {
  if (workflow.exists) {
    return tracker.pollReadyBeads();
  }

  return {
    command: readyCommand,
    readyBeads: [],
    queueSummary: [],
    selectedBead: null,
  };
}

/**
 * Create a status object from the current poll.
 * @param {unknown} args Status inputs.
 * @returns {unknown} Status object.
 */
function buildBaseStatus(args) {
  return {
    service: 'dadeto-local-symphony',
    state: args.trackerSummary.state,
    startedAt: args.startedAt,
    repoRoot: args.repoRoot,
    ...args.selectedBeadStatus,
    lastCommand: args.pollResult.command,
    lastPollSummary: args.lastPollSummary,
    lastPoll: {
      readyCount: args.pollResult.readyBeads.length,
      queueSummary: args.pollResult.queueSummary,
      selectedBead: args.pollResult.selectedBead,
    },
    workspacePath: null,
    config: {
      configPath: args.config.configPath,
      workspaceRoot: args.config.workspaceRoot,
      logDir: args.config.logDir,
      pollIntervalMs: args.config.pollIntervalMs,
      maxConcurrentRuns: args.config.maxConcurrentRuns,
      defaultBranch: args.config.defaultBranch,
      tracker: args.config.tracker,
      launcher: args.config.launcher,
    },
    operatorArtifacts: {
      statusPath: args.config.statusPath,
      runsDir: `${args.config.logDir}/runs`,
    },
    workflow: args.workflow,
    latestEvidence: args.trackerSummary.latestEvidence,
    operatorRecommendation: args.trackerSummary.operatorRecommendation,
    queueEvidence: args.trackerSummary.queueEvidence,
    runtime: {
      version: args.runtimeVersion,
    },
    eventLog: args.preservedEventLog,
  };
}

/**
 * Resolve injectable dependencies and option defaults for a snapshot.
 * @param {unknown} options Snapshot options.
 * @param {unknown} deps Runtime dependencies.
 * @returns {unknown} Resolved snapshot inputs.
 */
function resolveSnapshotInputs(options, deps) {
  return {
    now: options.now ?? (() => new Date()),
    configLoader: options.configLoader ?? deps.loadSymphonyConfig,
    trackerFactory: options.trackerFactory ?? deps.createBdTracker,
    previousStatus: options.previousStatus ?? null,
    workflowLoader: options.workflowLoader ?? deps.loadSymphonyWorkflow,
    repoRoot: options.repoRoot ?? deps.cwd(),
  };
}

/**
 * Build a fresh Symphony status snapshot.
 * @param {unknown} options Snapshot options.
 * @param {unknown} deps Runtime dependencies.
 * @returns {Promise<unknown>} Snapshot data.
 */
async function buildSymphonyStatusSnapshot(options, deps) {
  const {
    now,
    configLoader,
    trackerFactory,
    previousStatus,
    workflowLoader,
    repoRoot,
  } = resolveSnapshotInputs(options, deps);
  const config = await configLoader({ repoRoot });
  const workflow = await workflowLoader({ repoRoot });
  const runtimeVersion = deps.getSymphonyRuntimeVersion({ repoRoot });
  const tracker = trackerFactory({
    readyCommand: config.tracker.readyCommand,
    cwd: repoRoot,
  });
  const pollResult = await getPollResult(
    workflow,
    tracker,
    config.tracker.readyCommand
  );
  const trackerSummary = summarizeTrackerSelection({
    workflowExists: workflow.exists,
    selectedBead: pollResult.selectedBead,
    lastCommand: pollResult.command,
    pollResult: {
      readyCount: pollResult.readyBeads.length,
      queueSummary: pollResult.queueSummary,
    },
  });
  const selectedBeadStatus = buildSelectedBeadStatus(pollResult.selectedBead);
  const lastPollSummary = summarizePollResult({
    readyCount: pollResult.readyBeads.length,
    queueSummary: pollResult.queueSummary,
  });

  const preservedEventLog = getPreservedEventLog(previousStatus);

  let status = buildBaseStatus({
    trackerSummary,
    startedAt: now().toISOString(),
    repoRoot,
    selectedBeadStatus,
    pollResult,
    lastPollSummary,
    config,
    workflow,
    runtimeVersion,
    preservedEventLog,
  });

  if (shouldPreserveRunningStatus(previousStatus, status)) {
    status = preserveRunningStatus(status, previousStatus);
  }

  const preservedLaunchAttempt =
    getPreservedFailedLaunchAttempt(previousStatus);
  if (preservedLaunchAttempt) {
    status.lastLaunchAttempt = preservedLaunchAttempt;
  }

  return {
    status,
    config,
    workflow,
    pollResult,
  };
}

/**
 * Preserve a failed launch attempt from the previous status.
 * @param {unknown} previousStatus Previous status.
 * @returns {unknown} Failed launch attempt copy.
 */
function getPreservedFailedLaunchAttempt(previousStatus) {
  if (
    !previousStatus ||
    typeof previousStatus !== 'object' ||
    !previousStatus.lastLaunchAttempt ||
    typeof previousStatus.lastLaunchAttempt !== 'object'
  ) {
    return null;
  }

  if (previousStatus.lastLaunchAttempt.outcome !== 'failed') {
    return null;
  }

  return {
    ...previousStatus.lastLaunchAttempt,
  };
}

/**
 * Preserve the event log from the previous status.
 * @param {unknown} previousStatus Previous status.
 * @returns {unknown[]} Event log copy.
 */
function getPreservedEventLog(previousStatus) {
  if (!previousStatus || typeof previousStatus !== 'object') {
    return [];
  }

  if (!Array.isArray(previousStatus.eventLog)) {
    return [];
  }

  return [...previousStatus.eventLog];
}

/**
 * Read a current bead id from a status object.
 * @param {unknown} status Status object.
 * @returns {string | null} Bead id.
 */
function getStatusCurrentBeadId(status) {
  if (
    status &&
    typeof status === 'object' &&
    typeof status.currentBeadId === 'string' &&
    status.currentBeadId
  ) {
    return status.currentBeadId;
  }

  return null;
}

/**
 * Test whether a previous status represents an active running bead.
 * @param {unknown} previousStatus Previous status.
 * @returns {boolean} True when the previous status has a running active run.
 */
function hasPreviousActiveRun(previousStatus) {
  return Boolean(
    previousStatus &&
      typeof previousStatus === 'object' &&
      previousStatus.state === 'running' &&
      previousStatus.activeRun &&
      typeof previousStatus.activeRun === 'object'
  );
}

/**
 * Decide whether a previous running state should survive a refresh.
 * @param {unknown} previousStatus Previous status.
 * @param {unknown} status Newly built status.
 * @returns {boolean} True when the running status should be preserved.
 */
function shouldPreserveRunningStatus(previousStatus, status) {
  const previousBeadId = getStatusCurrentBeadId(previousStatus);
  const selectedBeadId = getStatusCurrentBeadId(status);

  return (
    hasPreviousActiveRun(previousStatus) &&
    previousBeadId !== null &&
    previousBeadId === selectedBeadId
  );
}

/**
 * Return a string field from one of two statuses.
 * @param {unknown} preferred Preferred status.
 * @param {unknown} fallback Fallback status.
 * @param {string} key Field name.
 * @returns {string | undefined} String value.
 */
function preserveStringField(preferred, fallback, key) {
  if (typeof preferred[key] === 'string') {
    return preferred[key];
  }

  return fallback[key];
}

/**
 * Return an object field copy from one of two statuses.
 * @param {unknown} preferred Preferred status.
 * @param {unknown} fallback Fallback status.
 * @param {string} key Field name.
 * @returns {unknown} Object field copy.
 */
function preserveObjectField(preferred, fallback, key) {
  if (preferred[key] && typeof preferred[key] === 'object') {
    return { ...preferred[key] };
  }

  return fallback[key];
}

/**
 * Preserve the previous running status for the same selected bead.
 * @param {unknown} status Newly built status.
 * @param {unknown} previousStatus Previous status.
 * @returns {unknown} Status with running fields preserved.
 */
function preserveRunningStatus(status, previousStatus) {
  return {
    ...status,
    startedAt: previousStatus.startedAt ?? status.startedAt,
    state: previousStatus.state,
    currentBeadId: previousStatus.currentBeadId,
    currentBeadTitle:
      previousStatus.currentBeadTitle ?? status.currentBeadTitle,
    currentBeadPriority:
      previousStatus.currentBeadPriority ?? status.currentBeadPriority,
    latestEvidence: preserveStringField(
      previousStatus,
      status,
      'latestEvidence'
    ),
    operatorRecommendation: preserveStringField(
      previousStatus,
      status,
      'operatorRecommendation'
    ),
    activeRun: {
      ...previousStatus.activeRun,
    },
    lastLaunchAttempt: preserveObjectField(
      previousStatus,
      status,
      'lastLaunchAttempt'
    ),
    lastOutcome: preserveObjectField(previousStatus, status, 'lastOutcome'),
  };
}

/**
 * Build the local Symphony bootstrap adapter handle.
 * @param {{
 *   createSymphonyStatusStore: (...args: unknown[]) => unknown,
 *   getSymphonyRuntimeVersion: (...args: unknown[]) => unknown,
 *   loadSymphonyConfig: (...args: unknown[]) => unknown,
 *   createBdTracker: (...args: unknown[]) => unknown,
 *   loadSymphonyWorkflow: (...args: unknown[]) => unknown,
 *   cwd: () => string,
 * }} deps Runtime dependencies.
 * @returns {{
 *   bootstrapSymphony: (...args: unknown[]) => unknown,
 *   refreshSymphonyStatus: (...args: unknown[]) => unknown,
 * }} Bootstrap handle.
 */
export function createSymphonyBootstrapHandle(deps) {
  return {
    bootstrapSymphony: createBootstrapSymphony(deps),
    refreshSymphonyStatus: createRefreshSymphonyStatus(deps),
  };
}
