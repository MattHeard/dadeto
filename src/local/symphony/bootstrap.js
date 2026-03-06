import { createSymphonyStatusStore } from './statusStore.js';
import { loadSymphonyConfig } from './config.js';
import { loadSymphonyWorkflow } from './workflow.js';

/**
 * @param {{
 *   repoRoot?: string,
 *   now?: () => Date,
 *   configLoader?: typeof loadSymphonyConfig,
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
  const workflowLoader = options.workflowLoader ?? loadSymphonyWorkflow;
  const repoRoot = options.repoRoot ?? process.cwd();
  const config = await configLoader({ repoRoot });
  const workflow = await workflowLoader({ repoRoot });
  const statusStoreFactory =
    options.statusStoreFactory ?? createSymphonyStatusStore;
  const statusStore = statusStoreFactory({
    statusPath: config.statusPath,
    logDir: config.logDir,
  });

  const status = {
    service: 'dadeto-local-symphony',
    state: workflow.exists ? 'idle' : 'blocked',
    startedAt: now().toISOString(),
    repoRoot,
    currentBeadId: null,
    lastCommand: config.tracker.readyCommand,
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
    latestEvidence: workflow.exists
      ? 'Local Symphony scaffold loaded workflow and config.'
      : 'WORKFLOW.md is missing; add it before enabling runner scheduling.',
  };

  await statusStore.writeStatus(status);

  return { status, statusStore };
}
