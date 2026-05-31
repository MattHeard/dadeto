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
  const state = await reconcileActiveRun({
    state: previousState,
    isProcessAliveImpl: options.isProcessAliveImpl,
    now,
    idleBackoff: options.config.idleBackoff,
    outcomeStore: options.outcomeStore,
  });

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
  const nextState = appendEvent(
    {
      ...state,
      lastPollAt: nowIso,
      lastOutcome: 'launched',
      lastSummary: `Launched Notion Codex run ${runId}.`,
      idleBackoffExponent: null,
      nextPollAfter: null,
      activeRun,
    },
    {
      at: nowIso,
      type: 'launched',
      runId,
      pid: activeRun.pid ?? null,
    }
  );

  await options.stateStore.writeState(nextState);

  return {
    launched: true,
    runId,
    prompt,
    launchResult,
    state: nextState,
  };
}

/**
 * Reconcile any active Notion Codex run with the current process state.
 * @param {{
 *   state: Record<string, unknown>,
 *   isProcessAliveImpl?: (pid: number) => boolean,
 *   now: Date,
 *   idleBackoff: {
 *     baseDelayMs: number,
 *     initialExponent: number,
 *     maxExponent: number
 *   },
 *   outcomeStore?: {
 *     readOutcome: (runId: string) => Promise<{ outcome: string, summary: string } | null>
 *   }
 * }} options Reconciliation inputs.
 * @returns {Promise<Record<string, unknown>>} Updated state.
 */
async function reconcileActiveRun(options) {
  const { state, now, idleBackoff, outcomeStore } = options;
  const isProcessAliveImpl = options.isProcessAliveImpl ?? isProcessAlive;

  if (!hasActiveRun(state)) {
    return state;
  }

  const activeRun = state.activeRun;
  const pid = activeRun.pid;
  if (!isStoppedRunPid(pid, isProcessAliveImpl)) {
    return state;
  }

  const runId = getActiveRunId(activeRun);
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

  return appendCompletedOutcome(state, {
    now,
    pid,
    runId,
    outcome,
  });
}

/**
 * Read the stored outcome for a finished run.
 * @param {{
 *   readOutcome?: (runId: string) => Promise<{ outcome: string, summary: string } | null>
 * } | undefined} outcomeStore Stored outcome accessor.
 * @param {string | null} runId Run identifier.
 * @returns {Promise<{ outcome: string, summary: string } | null>} Outcome record.
 */
async function readRunOutcome(outcomeStore, runId) {
  if (
    !outcomeStore ||
    typeof outcomeStore.readOutcome !== 'function' ||
    !runId
  ) {
    return null;
  }

  return outcomeStore.readOutcome(runId);
}

/**
 * Append an idle outcome to state.
 * @param {Record<string, unknown>} state Current state.
 * @param {{
 *   now: Date,
 *   pid: number,
 *   runId: string,
 *   summary?: string,
 *   idleBackoff?: {
 *     baseDelayMs: number,
 *     initialExponent: number,
 *     maxExponent: number
 *   }
 * }} options Idle outcome details.
 * @returns {Record<string, unknown>} Updated state.
 */
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
  let lastSummary = `Observed idle Notion Codex run ${options.runId}; next poll after ${nextPollAfter}.`;
  if (options.summary) {
    lastSummary = options.summary;
  }

  return appendEvent(
    {
      ...state,
      lastOutcome: 'idle',
      lastSummary,
      idleBackoffExponent,
      nextPollAfter,
      activeRun: null,
    },
    {
      at: options.now.toISOString(),
      type: 'idle',
      runId: options.runId,
      pid: options.pid,
      nextPollAfter,
    }
  );
}

/**
 * Determine whether the poll should wait for backoff.
 * @param {Record<string, unknown>} state Current state.
 * @param {Date} now Current time.
 * @returns {boolean} True when the poll should wait.
 */
function shouldDelayForBackoff(state, now) {
  return getRemainingDelayMs(state.nextPollAfter, now) > 0;
}

/**
 * Calculate the remaining delay until the next poll.
 * @param {string | null | undefined} nextPollAfter Scheduled poll time.
 * @param {Date} now Current time.
 * @returns {number} Remaining delay in milliseconds.
 */
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

/**
 * Check whether the process is still alive.
 * @param {number} pid Process identifier.
 * @returns {boolean} True when the process exists.
 */
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

/**
 * Read the active run identifier.
 * @param {Record<string, unknown> | null | undefined} activeRun Active run state.
 * @returns {string | null} Run identifier.
 */
export function getActiveRunId(activeRun) {
  if (activeRun && typeof activeRun === 'object') {
    if (typeof activeRun.runId === 'string') {
      return activeRun.runId;
    }
  }

  return null;
}

/**
 * Append an event to the bounded event log.
 * @param {Record<string, unknown>} state Current state.
 * @param {Record<string, unknown>} event Event payload.
 * @returns {Record<string, unknown>} Updated state.
 */
function appendEvent(state, event) {
  const previousEvents = getPreviousEvents(state.eventLog);
  return {
    ...state,
    eventLog: [...previousEvents, event].slice(-20),
  };
}

/**
 * Determine whether there is an active run object.
 * @param {Record<string, unknown>} state Current state.
 * @returns {boolean} True when an active run object exists.
 */
function hasActiveRun(state) {
  return Boolean(state.activeRun && typeof state.activeRun === 'object');
}

/**
 * Check whether a stopped run PID should be reconciled.
 * @param {unknown} pid Process identifier.
 * @param {(pid: number) => boolean} isProcessAliveImpl Process liveness probe.
 * @returns {boolean} True when the PID is stopped and should be reconciled.
 */
function isStoppedRunPid(pid, isProcessAliveImpl) {
  if (typeof pid !== 'number') {
    return false;
  }

  return !isProcessAliveImpl(pid);
}

/**
 * Append a completed or handled outcome to state.
 * @param {Record<string, unknown>} state Current state.
 * @param {{
 *   now: Date,
 *   pid: number,
 *   runId: string,
 *   outcome: { outcome: string, summary: string } | null
 * }} options Completion details.
 * @returns {Record<string, unknown>} Updated state.
 */
function appendCompletedOutcome(state, options) {
  let lastOutcome = 'completed';
  let eventType = 'completed';
  if (options.outcome?.outcome === 'handled') {
    lastOutcome = 'handled';
    eventType = 'handled';
  }

  let lastSummary = `Observed completed Notion Codex run ${options.runId}.`;
  if (options.outcome?.summary) {
    lastSummary = options.outcome.summary;
  }

  return appendEvent(
    {
      ...state,
      lastOutcome,
      lastSummary,
      idleBackoffExponent: null,
      nextPollAfter: null,
      activeRun: null,
    },
    {
      at: options.now.toISOString(),
      type: eventType,
      runId: options.runId,
      pid: options.pid,
    }
  );
}

/**
 * Read the previous event log entries.
 * @param {unknown} eventLog Event log value.
 * @returns {Array<Record<string, unknown>>} Event entries.
 */
function getPreviousEvents(eventLog) {
  if (Array.isArray(eventLog)) {
    return eventLog;
  }

  return [];
}
