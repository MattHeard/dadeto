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
  const now = options.now ?? (() => new Date());
  const configLoader = options.configLoader ?? loadSymphonyConfig;
  const trackerFactory = options.trackerFactory ?? createBdTracker;
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
  const statusStoreFactory =
    options.statusStoreFactory ?? createSymphonyStatusStore;
  const statusStore = statusStoreFactory({
    statusPath: config.statusPath,
    logDir: config.logDir,
  });
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

  const status = {
    service: 'dadeto-local-symphony',
    state: trackerSummary.state,
    startedAt: now().toISOString(),
    repoRoot,
    ...selectedBeadStatus,
    lastCommand: pollResult.command,
    lastPollSummary: summarizePollResult({
      readyCount: pollResult.readyBeads.length,
      queueSummary: pollResult.queueSummary,
    }),
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
    },
    workflow,
    latestEvidence: trackerSummary.latestEvidence,
    queueEvidence: trackerSummary.queueEvidence,
  };

  await statusStore.writeStatus(status);

  return { status, statusStore };
}
