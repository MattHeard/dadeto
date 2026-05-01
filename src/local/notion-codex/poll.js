import { buildNotionCodexPrompt } from './prompt.js';
import {
  getBinaryBackoffDelayMs,
  getNextIdleBackoffExponent,
  getNextPollAfterIso,
} from './backoff.js';

/**
 * @param {{
 *   config: Record<string, unknown>,
 *   repoRoot: string,
 *   stateStore: {
 *     readState: () => Promise<Record<string, unknown>>,
 *     writeState: (state: Record<string, unknown>) => Promise<void>
 *   },
 *   outcomeStore?: {
 *     readOutcome: (runId: string) => Promise<{ outcome: string, summary: string } | null>
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
  const state = await reconcileActiveRun(
    previousState,
    options.isProcessAliveImpl,
    now,
    options.config.idleBackoff,
    options.outcomeStore
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

  if (shouldDelayForBackoff(state, now)) {
    await options.stateStore.writeState(state);
    return {
      launched: false,
      skipped: true,
      reason: 'idle-backoff',
      nextDelayMs: getRemainingDelayMs(state.nextPollAfter, now),
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
    idleBackoffExponent: null,
    nextPollAfter: null,
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

async function reconcileActiveRun(
  state,
  isProcessAliveImpl = isProcessAlive,
  now,
  idleBackoff,
  outcomeStore
) {
  if (!state.activeRun || typeof state.activeRun !== 'object') {
    return state;
  }

  const pid = state.activeRun.pid;
  if (typeof pid !== 'number' || isProcessAliveImpl(pid)) {
    return state;
  }

  const runId = getActiveRunId(state.activeRun);
  const outcome = await readRunOutcome(outcomeStore, runId);
  if (outcome?.outcome === 'idle') {
    return appendIdleOutcome(state, {
      now,
      pid,
      runId,
      summary: outcome.summary,
      idleBackoff,
    });
  }

  return appendEvent({
    ...state,
    lastOutcome: outcome?.outcome === 'handled' ? 'handled' : 'completed',
    lastSummary: outcome?.summary || `Observed completed Notion Codex run ${runId}.`,
    idleBackoffExponent: null,
    nextPollAfter: null,
    activeRun: null,
  }, {
    at: now.toISOString(),
    type: outcome?.outcome === 'handled' ? 'handled' : 'completed',
    runId,
    pid,
  });
}

async function readRunOutcome(outcomeStore, runId) {
  if (!outcomeStore || typeof outcomeStore.readOutcome !== 'function' || !runId) {
    return null;
  }

  return outcomeStore.readOutcome(runId);
}

function appendIdleOutcome(state, options) {
  const idleBackoff = options.idleBackoff ?? {
    baseDelayMs: 60000,
    initialExponent: 0,
    maxExponent: 9,
  };
  const idleBackoffExponent = getNextIdleBackoffExponent({
    previousExponent: state.idleBackoffExponent,
    initialExponent: idleBackoff.initialExponent,
    maxExponent: idleBackoff.maxExponent,
  });
  const delayMs = getBinaryBackoffDelayMs({
    exponent: idleBackoffExponent,
    baseDelayMs: idleBackoff.baseDelayMs,
    initialExponent: idleBackoff.initialExponent,
    maxExponent: idleBackoff.maxExponent,
  });
  const nextPollAfter = getNextPollAfterIso({
    now: options.now,
    delayMs,
  });

  return appendEvent({
    ...state,
    lastOutcome: 'idle',
    lastSummary:
      options.summary ||
      `Observed idle Notion Codex run ${options.runId}; next poll after ${nextPollAfter}.`,
    idleBackoffExponent,
    nextPollAfter,
    activeRun: null,
  }, {
    at: options.now.toISOString(),
    type: 'idle',
    runId: options.runId,
    pid: options.pid,
    nextPollAfter,
  });
}

function shouldDelayForBackoff(state, now) {
  return getRemainingDelayMs(state.nextPollAfter, now) > 0;
}

function getRemainingDelayMs(nextPollAfter, now) {
  if (typeof nextPollAfter !== 'string') {
    return 0;
  }

  const nextPollAt = Date.parse(nextPollAfter);
  if (!Number.isFinite(nextPollAt)) {
    return 0;
  }

  return Math.max(0, nextPollAt - now.getTime());
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
