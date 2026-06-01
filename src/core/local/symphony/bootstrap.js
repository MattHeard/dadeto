import {
  buildSelectedBeadStatus,
  summarizePollResult,
  summarizeTrackerSelection,
} from '../symphony.js';

/**
 *
 * @param deps
 */
function createBootstrapSymphony(deps) {
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
 *
 * @param deps
 */
function createRefreshSymphonyStatus(deps) {
  return async function refreshSymphonyStatus(options = {}) {
    if (
      !options.statusStore ||
      typeof options.statusStore.writeStatus !== 'function'
    ) {
      throw new Error('Symphony refresh requires a writable status store.');
    }

    const previousStatus =
      options.statusStore &&
      typeof options.statusStore.readStatus === 'function'
        ? await options.statusStore.readStatus()
        : null;
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
 *
 * @param options
 * @param deps
 */
async function buildSymphonyStatusSnapshot(options, deps) {
  const now = options.now ?? (() => new Date());
  const configLoader = options.configLoader ?? deps.loadSymphonyConfig;
  const trackerFactory = options.trackerFactory ?? deps.createBdTracker;
  const previousStatus = options.previousStatus ?? null;
  const workflowLoader = options.workflowLoader ?? deps.loadSymphonyWorkflow;
  const repoRoot = options.repoRoot ?? deps.cwd();
  const config = await configLoader({ repoRoot });
  const workflow = await workflowLoader({ repoRoot });
  const runtimeVersion = deps.getSymphonyRuntimeVersion({ repoRoot });
  const tracker = trackerFactory({
    readyCommand: config.tracker.readyCommand,
    cwd: repoRoot,
  });
  const pollResult = workflow.exists
    ? await tracker.pollReadyBeads()
    : {
        command: config.tracker.readyCommand,
        readyBeads: [],
        queueSummary: [],
        selectedBead: null,
      };
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

  let status = {
    service: 'dadeto-local-symphony',
    state: trackerSummary.state,
    startedAt: now().toISOString(),
    repoRoot,
    ...selectedBeadStatus,
    lastCommand: pollResult.command,
    lastPollSummary,
    lastPoll: {
      readyCount: pollResult.readyBeads.length,
      queueSummary: pollResult.queueSummary,
      selectedBead: pollResult.selectedBead,
    },
    workspacePath: null,
    config: {
      configPath: config.configPath,
      workspaceRoot: config.workspaceRoot,
      logDir: config.logDir,
      pollIntervalMs: config.pollIntervalMs,
      maxConcurrentRuns: config.maxConcurrentRuns,
      defaultBranch: config.defaultBranch,
      tracker: config.tracker,
      launcher: config.launcher,
    },
    operatorArtifacts: {
      statusPath: config.statusPath,
      runsDir: `${config.logDir}/runs`,
    },
    workflow,
    latestEvidence: trackerSummary.latestEvidence,
    operatorRecommendation: trackerSummary.operatorRecommendation,
    queueEvidence: trackerSummary.queueEvidence,
    runtime: {
      version: runtimeVersion,
    },
    eventLog: preservedEventLog,
  };

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
 *
 * @param previousStatus
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
 *
 * @param previousStatus
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
 *
 * @param previousStatus
 * @param status
 */
function shouldPreserveRunningStatus(previousStatus, status) {
  const previousBeadId =
    previousStatus &&
    typeof previousStatus === 'object' &&
    typeof previousStatus.currentBeadId === 'string' &&
    previousStatus.currentBeadId
      ? previousStatus.currentBeadId
      : null;
  const selectedBeadId =
    status &&
    typeof status === 'object' &&
    typeof status.currentBeadId === 'string' &&
    status.currentBeadId
      ? status.currentBeadId
      : null;

  return (
    Boolean(previousStatus) &&
    typeof previousStatus === 'object' &&
    previousStatus.state === 'running' &&
    previousStatus.activeRun &&
    typeof previousStatus.activeRun === 'object' &&
    previousBeadId !== null &&
    previousBeadId === selectedBeadId
  );
}

/**
 *
 * @param status
 * @param previousStatus
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
    latestEvidence:
      typeof previousStatus.latestEvidence === 'string'
        ? previousStatus.latestEvidence
        : status.latestEvidence,
    operatorRecommendation:
      typeof previousStatus.operatorRecommendation === 'string'
        ? previousStatus.operatorRecommendation
        : status.operatorRecommendation,
    activeRun: {
      ...previousStatus.activeRun,
    },
    lastLaunchAttempt:
      previousStatus.lastLaunchAttempt &&
      typeof previousStatus.lastLaunchAttempt === 'object'
        ? { ...previousStatus.lastLaunchAttempt }
        : status.lastLaunchAttempt,
    lastOutcome:
      previousStatus.lastOutcome &&
      typeof previousStatus.lastOutcome === 'object'
        ? { ...previousStatus.lastOutcome }
        : status.lastOutcome,
  };
}

/**
 * Build the local Symphony bootstrap adapter handle.
 * @param {{
 *   createSymphonyStatusStore: Function,
 *   getSymphonyRuntimeVersion: Function,
 *   loadSymphonyConfig: Function,
 *   createBdTracker: Function,
 *   loadSymphonyWorkflow: Function,
 *   cwd: () => string,
 * }} deps Runtime dependencies.
 * @returns {{
 *   bootstrapSymphony: Function,
 *   refreshSymphonyStatus: Function,
 * }} Bootstrap handle.
 */
export function createSymphonyBootstrapHandle(deps) {
  return {
    bootstrapSymphony: createBootstrapSymphony(deps),
    refreshSymphonyStatus: createRefreshSymphonyStatus(deps),
  };
}
