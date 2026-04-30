import { buildNotionCodexPrompt } from './prompt.js';

/**
 * @param {{
 *   config: Record<string, unknown>,
 *   repoRoot: string,
 *   stateStore: {
 *     readState: () => Promise<Record<string, unknown>>,
 *     writeState: (state: Record<string, unknown>) => Promise<void>
 *   },
 *   launcher: {
 *     launch: (payload: {
 *       repoRoot: string,
 *       runId: string,
 *       prompt: string
 *     }) => Promise<Record<string, unknown>>
 *   },
 *   now?: Date,
 *   dryRun?: boolean,
 *   isProcessAliveImpl?: (pid: number) => boolean
 * }} options Poll dependencies.
 * @returns {Promise<Record<string, unknown>>} Poll result.
 */
export async function runNotionCodexPoll(options) {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const previousState = await options.stateStore.readState();
  const state = reconcileActiveRun(
    previousState,
    options.isProcessAliveImpl,
    nowIso
  );

  if (state.activeRun) {
    const runId = getActiveRunId(state.activeRun);
    return {
      launched: false,
      skipped: true,
      reason: 'active-run',
      runId,
      state,
    };
  }

  const runId = `${nowIso}--notion-codex`;
  const prompt = buildNotionCodexPrompt({
    config: options.config,
    repoRoot: options.repoRoot,
    runId,
    nowIso,
  });

  if (options.dryRun) {
    return {
      launched: false,
      dryRun: true,
      runId,
      prompt,
      state,
    };
  }

  const launchResult = await options.launcher.launch({
    repoRoot: options.repoRoot,
    runId,
    prompt,
  });
  const activeRun = {
    runId,
    startedAt: nowIso,
    ...launchResult,
  };
  const nextState = appendEvent({
    ...state,
    lastPollAt: nowIso,
    lastOutcome: 'launched',
    lastSummary: `Launched Notion Codex run ${runId}.`,
    activeRun,
  }, {
    at: nowIso,
    type: 'launched',
    runId,
    pid: activeRun.pid ?? null,
  });

  await options.stateStore.writeState(nextState);

  return {
    launched: true,
    runId,
    prompt,
    launchResult,
    state: nextState,
  };
}

function reconcileActiveRun(state, isProcessAliveImpl = isProcessAlive, nowIso) {
  if (!state.activeRun || typeof state.activeRun !== 'object') {
    return state;
  }

  const pid = state.activeRun.pid;
  if (typeof pid !== 'number' || isProcessAliveImpl(pid)) {
    return state;
  }

  return appendEvent({
    ...state,
    lastOutcome: 'completed',
    lastSummary: `Observed completed Notion Codex run ${getActiveRunId(state.activeRun)}.`,
    activeRun: null,
  }, {
    at: nowIso,
    type: 'completed',
    runId: getActiveRunId(state.activeRun),
    pid,
  });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error.code === 'ESRCH') {
        return false;
      }
      if (error.code === 'EPERM') {
        return true;
      }
    }

    throw error;
  }
}

function getActiveRunId(activeRun) {
  if (activeRun && typeof activeRun === 'object') {
    return typeof activeRun.runId === 'string' ? activeRun.runId : null;
  }

  return null;
}

function appendEvent(state, event) {
  const previousEvents = Array.isArray(state.eventLog) ? state.eventLog : [];
  return {
    ...state,
    eventLog: [...previousEvents, event].slice(-20),
  };
}
