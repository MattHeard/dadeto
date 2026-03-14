import { createSymphonyStatusStore } from './statusStore.js';
import {
  buildSelectedBeadStatus,
  summarizePollResult,
  summarizeTrackerSelection,
} from '../../core/local/symphony.js';
import { loadSymphonyConfig } from './config.js';
import { createBdTracker } from './trackerBd.js';
import { loadSymphonyWorkflow } from './workflow.js';

/**
 * @param {{
 *   repoRoot?: string,
  *   now?: () => Date,
  *   configLoader?: typeof loadSymphonyConfig,
  *   trackerFactory?: typeof createBdTracker,
  *   workflowLoader?: typeof loadSymphonyWorkflow,
  *   statusStoreFactory?: typeof createSymphonyStatusStore
  * }} [options]
 * @returns {Promise<{
 *   status: Record<string, unknown>,
 *   statusStore: ReturnType<typeof createSymphonyStatusStore>
 * }>} Bootstrapped local Symphony status shell.
 */
export async function bootstrapSymphony(options = {}) {
  const snapshot = await buildSymphonyStatusSnapshot(options);
  const statusStoreFactory =
    options.statusStoreFactory ?? createSymphonyStatusStore;
  const statusStore = statusStoreFactory({
    statusPath: snapshot.config.statusPath,
    logDir: snapshot.config.logDir,
  });

  await statusStore.writeStatus(snapshot.status);

  return { status: snapshot.status, statusStore };
}

/**
 * @param {{
 *   repoRoot?: string,
  *   now?: () => Date,
  *   configLoader?: typeof loadSymphonyConfig,
  *   trackerFactory?: typeof createBdTracker,
  *   workflowLoader?: typeof loadSymphonyWorkflow,
  *   statusStore: ReturnType<typeof createSymphonyStatusStore>
  * }} options
 * @returns {Promise<{
 *   status: Record<string, unknown>,
 *   config: ReturnType<typeof loadSymphonyConfig>,
 *   workflow: ReturnType<typeof loadSymphonyWorkflow>,
 *   pollResult: {
 *     command: string,
 *     readyBeads: Array<{ id: string, title: string, priority: string }>,
 *     queueSummary: string[],
 *     selectedBead: { id: string, title: string, priority: string } | null
 *   }
 * }>} Snapshot for a refreshed Symphony status.
 */
export async function refreshSymphonyStatus(options = {}) {
  if (!options.statusStore || typeof options.statusStore.writeStatus !== 'function') {
    throw new Error('Symphony refresh requires a writable status store.');
  }

  const previousStatus =
    options.statusStore && typeof options.statusStore.readStatus === 'function'
      ? await options.statusStore.readStatus()
      : null;
  const snapshot = await buildSymphonyStatusSnapshot({
    ...options,
    previousStatus,
  });
  await options.statusStore.writeStatus(snapshot.status);

  return snapshot;
}

async function buildSymphonyStatusSnapshot(options = {}) {
  const now = options.now ?? (() => new Date());
  const configLoader = options.configLoader ?? loadSymphonyConfig;
  const trackerFactory = options.trackerFactory ?? createBdTracker;
  const previousStatus = options.previousStatus ?? null;
  const workflowLoader = options.workflowLoader ?? loadSymphonyWorkflow;
  const repoRoot = options.repoRoot ?? process.cwd();
  const config = await configLoader({ repoRoot });
  const workflow = await workflowLoader({ repoRoot });
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
    eventLog: preservedEventLog,
  };

  if (shouldPreserveRunningStatus(previousStatus)) {
    status = preserveRunningStatus(status, previousStatus);
  }

  const preservedLaunchAttempt = getPreservedFailedLaunchAttempt(previousStatus);
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

function getPreservedEventLog(previousStatus) {
  if (!previousStatus || typeof previousStatus !== 'object') {
    return [];
  }

  if (!Array.isArray(previousStatus.eventLog)) {
    return [];
  }

  return [...previousStatus.eventLog];
}

function shouldPreserveRunningStatus(previousStatus) {
  return (
    !!previousStatus &&
    typeof previousStatus === 'object' &&
    previousStatus.state === 'running' &&
    previousStatus.activeRun &&
    typeof previousStatus.activeRun === 'object'
  );
}

function preserveRunningStatus(status, previousStatus) {
  return {
    ...status,
    startedAt: previousStatus.startedAt ?? status.startedAt,
    state: previousStatus.state,
    currentBeadId:
      previousStatus.currentBeadId ?? status.currentBeadId,
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
