import { buildNotionCodexPrompt } from './prompt.js';
import {
  getBinaryBackoffDelayMs,
  getNextIdleBackoffExponent,
  getNextPollAfterIso,
} from './backoff.js';

/**
 * @typedef {object} NotionCodexIdleBackoffConfig
 * @property {number} baseDelayMs Base delay in milliseconds.
 * @property {number} initialExponent Initial exponent value.
 * @property {number} maxExponent Maximum exponent value.
 */

/**
 * @typedef {object} NotionCodexPollConfig
 * @property {{
 *   dadetoPageId: string,
 *   dadetoPageUrl: string,
 *   symphonyPageId: string,
 *   symphonyPageUrl: string,
 *   taskDataSourceUrl: string,
 *   taskContext: string,
 *   taskStatus: string,
 *   messageSearchQuery: string,
 *   inboxPageIds: string[],
 *   apiTokenEnvNames?: string[],
 *   apiVersion?: string
 * }} notion Notion config payload.
 * @property {NotionCodexIdleBackoffConfig} idleBackoff Idle backoff settings.
 */
/**
 * @typedef {object} NotionCodexPollActiveRun
 * @property {string} runId Run identifier.
 * @property {string} startedAt Start timestamp.
 * @property {number | null} [pid] Process identifier.
 * @property {string} [launcherKind] Launcher kind.
 * @property {string} [command] Launcher command.
 * @property {string[]} [args] Launcher args.
 * @property {string} [stdoutPath] Run stdout path.
 * @property {string} [stderrPath] Run stderr path.
 */

/**
 * @typedef {object} NotionCodexRunOutcome
 * @property {string} outcome Outcome name.
 * @property {string} summary Outcome summary.
 */

/**
 * @typedef {object} NotionCodexPollState
 * @property {NotionCodexPollActiveRun | null} [activeRun] Active run state.
 * @property {string | null} [nextPollAfter] Next poll time.
 * @property {number | null} [idleBackoffExponent] Idle backoff exponent.
 * @property {string | null} [lastOutcome] Last outcome.
 * @property {string | null} [lastSummary] Last summary.
 * @property {string | null} [lastPollAt] Last poll time.
 * @property {Array<Record<string, unknown>>} [eventLog] Event history.
 */

/**
 * @typedef {object} NotionCodexLaunchResult
 * @property {string} launcherKind Launcher kind.
 * @property {string} command Launcher command.
 * @property {string[]} args Launcher args.
 * @property {number | null} pid Process identifier.
 * @property {string} stdoutPath Stdout log path.
 * @property {string} stderrPath Stderr log path.
 */

/**
 * @param {{
 *   config: NotionCodexPollConfig,
 *   repoRoot: string,
 *   stateStore: {
 *     readState: () => Promise<NotionCodexPollState>,
 *     writeState: (state: NotionCodexPollState) => Promise<void>
 *   },
 *   outcomeStore?: {
 *     readOutcome: (runId: string) => Promise<NotionCodexRunOutcome | null>
 *   },
 *   launcher: {
 *     launch: (payload: {
 *       repoRoot: string,
 *       runId: string,
 *       prompt: string
 *     }) => Promise<NotionCodexLaunchResult>
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
  const activeRun = /** @type {NotionCodexPollActiveRun} */ ({
    runId,
    startedAt: nowIso,
    ...launchResult,
  });
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
 *   state: NotionCodexPollState,
 *   isProcessAliveImpl?: (pid: number) => boolean,
 *   now: Date,
 *   idleBackoff: {
 *     baseDelayMs: number,
 *     initialExponent: number,
 *     maxExponent: number
 *   },
 *   outcomeStore?: {
 *     readOutcome: (runId: string) => Promise<NotionCodexRunOutcome | null>
 *   }
 * }} options Reconciliation inputs.
 * @returns {Promise<NotionCodexPollState>} Updated state.
 */
async function reconcileActiveRun(options) {
  const { state, now, idleBackoff, outcomeStore } = options;
  const isProcessAliveImpl = options.isProcessAliveImpl ?? isProcessAlive;

  const activeRun = getActiveRun(state);
  if (!activeRun) {
    return state;
  }

  const pid = activeRun.pid ?? null;
  if (!isStoppedRunPid(pid, isProcessAliveImpl)) {
    return state;
  }

  const runId = activeRun.runId;
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
 *   readOutcome?: (runId: string) => Promise<NotionCodexRunOutcome | null>
 * } | undefined} outcomeStore Stored outcome accessor.
 * @param {string | null} runId Run identifier.
 * @returns {Promise<NotionCodexRunOutcome | null>} Outcome record.
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
 * @param {NotionCodexPollState} state Current state.
 * @param {{
 *   now: Date,
 *   pid: number | null,
 *   runId: string,
 *   summary?: string,
 *   idleBackoff?: {
 *     baseDelayMs: number,
 *     initialExponent: number,
 *     maxExponent: number
 *   }
 * }} options Idle outcome details.
 * @returns {NotionCodexPollState} Updated state.
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
 * @param {NotionCodexPollState} state Current state.
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
 * @param {NotionCodexPollActiveRun | null | undefined} activeRun Active run state.
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
 * @param {NotionCodexPollState} state Current state.
 * @param {Record<string, unknown>} event Event payload.
 * @returns {NotionCodexPollState} Updated state.
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
 * @param {NotionCodexPollState} state Current state.
 * @returns {NotionCodexPollActiveRun | null} Active run object or null.
 */
function getActiveRun(state) {
  if (state.activeRun && typeof state.activeRun === 'object') {
    return state.activeRun;
  }

  return null;
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
 * @param {NotionCodexPollState} state Current state.
 * @param {{
 *   now: Date,
 *   pid: number | null,
 *   runId: string,
 *   outcome: NotionCodexRunOutcome | null
 * }} options Completion details.
 * @returns {NotionCodexPollState} Updated state.
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
    return /** @type {Array<Record<string, unknown>>} */ (eventLog);
  }

  return [];
}
