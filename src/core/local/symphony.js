/**
 * @param {string} output Raw `bd ready` command output.
 * @returns {Array<{ id: string, title: string, priority: string }>} Parsed ready bead summaries.
 */
export function parseReadyBeads(output) {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseReadyLine)
    .filter(isReadyBead);
}

/**
 * @param {string} line One `bd ready` output line.
 * @returns {{ id: string, title: string, priority: string } | null} Parsed bead summary.
 */
function parseReadyLine(line) {
  const match = line.match(
    /^\d+\.\s+\[(.+?)\]\s+\[.+?\]\s+([a-z0-9-]+):\s+(.+)$/i
  );
  if (!match) {
    return null;
  }

  return {
    priority: match[1],
    id: match[2],
    title: match[3],
  };
}

/**
 * @param {{ id: string, title: string, priority: string } | null} bead Parsed bead summary.
 * @returns {bead is { id: string, title: string, priority: string }}
 *   Whether the parsed bead summary is non-null.
 */
function isReadyBead(bead) {
  return bead !== null;
}

/**
 * @param {Array<{ id: string, title: string, priority: string }>} beads Ready bead summaries.
 * @returns {{ id: string, title: string, priority: string } | null} Selected bead or null.
 */
export function selectNextBead(beads) {
  return beads[0] ?? null;
}

/**
 * @param {Array<{ id: string, title: string, priority: string }>} beads Ready bead summaries.
 * @returns {string[]} Human-readable queue evidence lines.
 */
export function summarizeReadyBeadQueue(beads) {
  return beads.map(bead => `${bead.id} (${bead.priority}) ${bead.title}`);
}

/**
 * @param {{ id: string, title: string, priority: string } | null} selectedBead Selected bead or null.
 * @param {'id' | 'title' | 'priority'} field Selected bead field to read.
 * @returns {string | null} Selected bead field value or null.
 */
function getSelectedBeadField(selectedBead, field) {
  if (!selectedBead) {
    return null;
  }

  return selectedBead[field];
}

/**
 * @param {{ readyCount: number, queueSummary?: string[] }} pollResult Poll result summary.
 * @returns {string[]} Queue summary lines.
 */
function getQueueSummary(pollResult) {
  return pollResult.queueSummary ?? [];
}

/**
 * @param {{ id: string, title: string, priority: string } | null} selectedBead Selected bead or null.
 * @returns {{ currentBeadId: string | null, currentBeadTitle: string | null, currentBeadPriority: string | null }} Top-level status fields for the selected bead.
 */
export function buildSelectedBeadStatus(selectedBead) {
  return {
    currentBeadId: getSelectedBeadField(selectedBead, 'id'),
    currentBeadTitle: getSelectedBeadField(selectedBead, 'title'),
    currentBeadPriority: getSelectedBeadField(selectedBead, 'priority'),
  };
}

/**
 * @param {{ readyCount: number, queueSummary?: string[] }} pollResult Poll result summary.
 * @returns {string} Compact poll summary for operator-visible logs.
 */
export function summarizePollResult(pollResult) {
  const queueSummary = getQueueSummary(pollResult);
  if (queueSummary.length === 0) {
    return `${String(pollResult.readyCount)} ready bead(s)`;
  }

  return `${String(pollResult.readyCount)} ready bead(s): ${queueSummary.join('; ')}`;
}

/**
 * @param {{
 *   workflowExists: boolean,
 *   selectedBead: { id: string, title: string, priority: string },
 *   lastCommand: string,
 *   pollResult: { readyCount: number, queueSummary?: string[] }
 * }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, operatorRecommendation: string, queueEvidence: string[] }} Tracker selection status summary.
 */
function getReadySelectionSummary(input) {
  const queueEvidence = input.pollResult.queueSummary ?? [];
  return {
    state: 'ready',
    latestEvidence: `${input.lastCommand} selected ${input.selectedBead.id} from ${summarizePollResult(input.pollResult)}.`,
    operatorRecommendation: `Run the next worker loop on ${input.selectedBead.id}.`,
    queueEvidence,
  };
}

/**
 * @returns {{ state: string, latestEvidence: string, operatorRecommendation: string, queueEvidence: string[] }} Blocked tracker selection status summary.
 */
function getBlockedSelectionSummary() {
  return {
    state: 'blocked',
    latestEvidence:
      'WORKFLOW.md is missing; add it before enabling runner scheduling.',
    operatorRecommendation:
      'Add WORKFLOW.md so Symphony can decide what the runner should do next.',
    queueEvidence: [],
  };
}

/**
 * @param {{ lastCommand: string }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, operatorRecommendation: string, queueEvidence: string[] }} Idle tracker selection status summary.
 */
function getIdleSelectionSummary(input) {
  return {
    state: 'idle',
    latestEvidence: `${input.lastCommand} found no ready beads.`,
    operatorRecommendation:
      'Create or refresh the next bead before starting another runner loop.',
    queueEvidence: [],
  };
}

/**
 * @param {{ id: string, title: string, priority: string } | null} selectedBead Selected bead or null.
 * @returns {'idle' | 'ready'} Tracker selection state when workflow exists.
 */
function getActiveSelectionStateKey(selectedBead) {
  if (!selectedBead) {
    return 'idle';
  }

  return 'ready';
}

/**
 * @param {{
 *   workflowExists: boolean,
 *   selectedBead: { id: string, title: string, priority: string } | null
 * }} input Tracker polling state.
 * @returns {'blocked' | 'idle' | 'ready'} Tracker selection state key.
 */
function getSelectionStateKey(input) {
  if (!input.workflowExists) {
    return 'blocked';
  }

  return getActiveSelectionStateKey(input.selectedBead);
}

/**
 * @param {'blocked' | 'idle' | 'ready'} selectionStateKey Tracker selection state key.
 * @returns {(input: Parameters<typeof summarizeTrackerSelection>[0]) => ReturnType<typeof summarizeTrackerSelection>} Summary handler.
 */
function getTrackerSelectionSummaryHandler(selectionStateKey) {
  return TRACKER_SELECTION_SUMMARY_HANDLERS[selectionStateKey];
}

const TRACKER_SELECTION_SUMMARY_HANDLERS = {
  blocked: () => getBlockedSelectionSummary(),
  idle: input => getIdleSelectionSummary(input),
  ready: input =>
    getReadySelectionSummary({
      ...input,
      selectedBead:
        /** @type {{ id: string, title: string, priority: string }} */ (
          input.selectedBead
        ),
    }),
};

/**
 * @param {{
 *   workflowExists: boolean,
 *   selectedBead: { id: string, title: string, priority: string } | null,
 *   lastCommand: string,
 *   pollResult: { readyCount: number, queueSummary?: string[] }
 * }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, operatorRecommendation: string, queueEvidence: string[] }} Tracker selection status summary.
 */
export function summarizeTrackerSelection(input) {
  const selectionStateKey = getSelectionStateKey(input);
  return getTrackerSelectionSummaryHandler(selectionStateKey)(input);
}

const MAX_EVENT_LOG_ENTRIES = 5;

/**
 * @param {{
 *   state?: string,
 *   currentBeadId?: string | null,
 *   currentBeadTitle?: string | null,
 *   currentBeadPriority?: string | null,
 *   queueEvidence?: string[],
 *   [key: string]: unknown
 * }} status Current scheduler-visible status.
 * @param {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   launcherKind?: string | null,
 *   command?: string | null,
 *   args?: unknown,
 *   pid?: number | null,
 *   stdoutPath?: string | null,
 *   stderrPath?: string | null
 * }} launch Runner launch to apply.
 * @returns {Record<string, unknown>} Updated scheduler-visible status.
 */
export function applyRunnerLaunch(status, launch) {
  const updatedStatus = {
    ...status,
    state: 'running',
    currentBeadId: launch.beadId,
    currentBeadTitle: getLaunchTextField(launch.beadTitle),
    currentBeadPriority: getLaunchTextField(launch.beadPriority),
    latestEvidence: buildRunnerLaunchEvidence(launch),
    operatorRecommendation: buildRunnerLaunchRecommendation(launch),
    activeRun: buildActiveRunStatus(launch),
    lastLaunchAttempt: buildSuccessfulLaunchAttempt(launch),
  };

  return addSymphonyEvent(updatedStatus, buildBeadStartedEvent(launch));
}

/**
 * @param {{
 *   state?: string,
 *   currentBeadId?: string | null,
 *   currentBeadTitle?: string | null,
 *   currentBeadPriority?: string | null,
 *   queueEvidence?: string[],
 *   [key: string]: unknown
 * }} status Current scheduler-visible status.
 * @param {{
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   error: string
 * }} failure Failed runner launch to apply.
 * @returns {Record<string, unknown>} Updated scheduler-visible status.
 */
export function applyRunnerLaunchFailure(status, failure) {
  const failedStatus = {
    ...status,
    startedAt: failure.startedAt,
    state: 'blocked',
    currentBeadId: failure.beadId,
    currentBeadTitle: getLaunchTextField(failure.beadTitle),
    currentBeadPriority: getLaunchTextField(failure.beadPriority),
    latestEvidence: buildRunnerLaunchFailureEvidence(failure),
    operatorRecommendation:
      'Inspect the Ralph launcher configuration or local Codex availability before retrying this bead.',
    queueEvidence: [buildRunnerLaunchFailureQueueEvidence(failure)],
    activeRun: null,
    lastLaunchAttempt: {
      startedAt: failure.startedAt,
      beadId: failure.beadId,
      beadTitle: getLaunchTextField(failure.beadTitle),
      beadPriority: getLaunchTextField(failure.beadPriority),
      launchRequest: failure.launchRequest,
      outcome: 'failed',
      error: failure.error,
    },
  };

  return addSymphonyEvent(failedStatus, buildLaunchRejectedEvent(failure));
}

/**
 * @param {{
 *   state?: string,
 *   currentBeadId?: string | null,
 *   currentBeadTitle?: string | null,
 *   currentBeadPriority?: string | null,
 *   queueEvidence?: string[],
 *   [key: string]: unknown
 * }} status Current scheduler-visible status.
 * @param {{
 *   beadId: string,
 *   beadTitle?: string,
 *   outcome: 'completed' | 'blocked',
 *   summary: string
 * }} outcome Runner outcome to apply.
 * @returns {Record<string, unknown>} Updated scheduler-visible status.
 */
export function applyRunnerOutcome(status, outcome) {
  if (outcome.outcome === 'blocked') {
    return buildBlockedOutcomeStatus(status, outcome);
  }

  return buildCompletedOutcomeStatus(status, outcome);
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @param {{ beadId: string, beadTitle?: string, outcome: 'completed' | 'blocked', summary: string }} outcome
 *   Runner outcome to apply.
 * @returns {Record<string, unknown>} Updated status after a completed runner loop.
 */
function buildCompletedOutcomeStatus(status, outcome) {
  return buildRunnerOutcomeStatus(status, outcome, {
    currentBeadState: {
      currentBeadId: null,
      currentBeadTitle: null,
      currentBeadPriority: null,
    },
    state: 'idle',
    latestEvidenceKind: 'completed',
    operatorRecommendation:
      'Refresh the queue and choose the next ready bead before launching another runner loop.',
    queueEvidence: [],
  });
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @param {{ beadId: string, beadTitle?: string, outcome: 'completed' | 'blocked', summary: string }} outcome
 *   Runner outcome to apply.
 * @returns {Record<string, unknown>} Updated status after a blocked runner handoff.
 */
function buildBlockedOutcomeStatus(status, outcome) {
  return buildRunnerOutcomeStatus(status, outcome, {
    currentBeadState: null,
    state: 'blocked',
    latestEvidenceKind: 'blocked',
    operatorRecommendation:
      'Inspect the blocker, update the bead or workflow guidance, and only then launch another runner loop.',
    queueEvidence: [buildRunnerOutcomeQueueEvidence(outcome)],
  });
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @param {{ beadId: string, beadTitle?: string, outcome: 'completed' | 'blocked', summary: string }} outcome
 *   Runner outcome to apply.
 * @param {{
 *   currentBeadState: {
 *     currentBeadId: string | null,
 *     currentBeadTitle: string | null,
 *     currentBeadPriority: string | null
 *   } | null,
 *   state: string,
 *   latestEvidenceKind: 'completed' | 'blocked',
 *   operatorRecommendation: string,
 *   queueEvidence: string[]
 * }} options Runner status assembly options.
 * @returns {Record<string, unknown>} Updated status after applying the runner outcome.
 */
function buildRunnerOutcomeStatus(status, outcome, options) {
  const updatedStatus = {
    ...status,
    state: options.state,
    latestEvidence: buildRunnerOutcomeEvidence(
      options.latestEvidenceKind,
      outcome
    ),
    operatorRecommendation: options.operatorRecommendation,
    queueEvidence: options.queueEvidence,
    lastOutcome: buildRunnerLastOutcome(outcome),
    activeRun: null,
  };

  if (options.currentBeadState) {
    updatedStatus.currentBeadId = options.currentBeadState.currentBeadId;
    updatedStatus.currentBeadTitle = options.currentBeadState.currentBeadTitle;
    updatedStatus.currentBeadPriority =
      options.currentBeadState.currentBeadPriority;
  }

  return addSymphonyEvent(
    updatedStatus,
    buildRunnerOutcomeEventMessage(outcome)
  );
}

/**
 * @param {{ beadId: string, beadTitle?: string, outcome: 'completed' | 'blocked', summary: string }} outcome
 *   Runner outcome to normalize.
 * @returns {{ beadId: string, beadTitle: string | null, outcome: 'completed' | 'blocked', summary: string }}
 *   Normalized last outcome record.
 */
function buildRunnerLastOutcome(outcome) {
  return {
    beadId: outcome.beadId,
    beadTitle: outcome.beadTitle ?? null,
    outcome: outcome.outcome,
    summary: outcome.summary,
  };
}

/**
 * @param {'completed' | 'blocked'} outcomeKind Outcome kind label.
 * @param {{ beadId: string, summary: string }} outcome Runner outcome to apply.
 * @returns {string} Operator-visible evidence line for the outcome.
 */
function buildRunnerOutcomeEvidence(outcomeKind, outcome) {
  return `Runner ${outcomeKind} ${outcome.beadId}: ${outcome.summary}`;
}

/**
 * @param {{ runId: string, beadId: string, launchRequest: string }} launch Runner launch to apply.
 * @returns {string} Operator-visible evidence line for the launched run.
 */
function buildRunnerLaunchEvidence(launch) {
  return `Runner launch ${launch.runId} started for ${launch.beadId}: ${launch.launchRequest}`;
}

/**
 * @param {{ beadId: string, error: string }} failure Failed runner launch to apply.
 * @returns {string} Operator-visible evidence line for the failed launch.
 */
function buildRunnerLaunchFailureEvidence(failure) {
  return `Runner launch failed for ${failure.beadId}: ${failure.error}`;
}

/**
 * @param {string | null | undefined} value Candidate launch text field.
 * @returns {string | null} Normalized launch text field.
 */
function getLaunchTextField(value) {
  return value ?? null;
}

/**
 * @param {{ beadId: string }} launch Runner launch to apply.
 * @returns {string} Operator recommendation for the launched run.
 */
function buildRunnerLaunchRecommendation(launch) {
  return `Wait for the runner loop on ${launch.beadId} to finish before launching another bead.`;
}

/**
 * @param {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   launcherKind?: string | null,
 *   command?: string | null,
 *   args?: unknown,
 *   pid?: number | null,
 *   stdoutPath?: string | null,
 *   stderrPath?: string | null
 * }} launch Runner launch to apply.
 * @returns {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   beadPriority: string | null,
 *   launchRequest: string,
 *   outcome: string,
 *   launcherKind: string | null,
 *   command: string | null,
 *   args: string[],
 *   pid: number | null,
 *   stdoutPath: string | null,
 *   stderrPath: string | null
 * }} Successful launch summary.
 */
function buildSuccessfulLaunchAttempt(launch) {
  return {
    ...buildLaunchRecord(launch),
    outcome: 'started',
  };
}

/**
 * @param {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   launcherKind?: string | null,
 *   command?: string | null,
 *   args?: unknown,
 *   pid?: number | null,
 *   stdoutPath?: string | null,
 *   stderrPath?: string | null
 * }} launch Runner launch to apply.
 * @returns {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   beadPriority: string | null,
 *   launchRequest: string,
 *   launcherKind: string | null,
 *   command: string | null,
 *   args: string[],
 *   pid: number | null,
 *   stdoutPath: string | null,
 *   stderrPath: string | null,
 *   state: string
 * }} Active run status summary.
 */
function buildActiveRunStatus(launch) {
  return {
    ...buildLaunchRecord(launch),
    state: 'running',
  };
}

/**
 * @param {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string,
 *   launcherKind?: string | null,
 *   command?: string | null,
 *   args?: unknown,
 *   pid?: number | null,
 *   stdoutPath?: string | null,
 *   stderrPath?: string | null
 * }} launch Runner launch to normalize.
 * @returns {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle: string | null,
 *   beadPriority: string | null,
 *   launchRequest: string,
 *   launcherKind: string | null,
 *   command: string | null,
 *   args: string[],
 *   pid: number | null,
 *   stdoutPath: string | null,
 *   stderrPath: string | null
 * }} Shared launch record fields.
 */
function buildLaunchRecord(launch) {
  return {
    runId: launch.runId,
    startedAt: launch.startedAt,
    beadId: launch.beadId,
    beadTitle: getLaunchTextField(launch.beadTitle),
    beadPriority: getLaunchTextField(launch.beadPriority),
    launchRequest: launch.launchRequest,
    launcherKind: getLaunchTextField(launch.launcherKind),
    command: getLaunchTextField(launch.command),
    args: getLaunchArgs(launch.args),
    pid: getLaunchPid(launch.pid),
    stdoutPath: getLaunchTextField(launch.stdoutPath),
    stderrPath: getLaunchTextField(launch.stderrPath),
  };
}

/**
 * @param {unknown} value Candidate launch args.
 * @returns {string[]} Normalized launch args.
 */
function getLaunchArgs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}

/**
 * @param {unknown} value Candidate launch pid.
 * @returns {number | null} Normalized launch pid.
 */
function getLaunchPid(value) {
  if (typeof value !== 'number') {
    return null;
  }

  return value;
}

/**
 * @param {{ beadId: string, error: string }} failure Failed runner launch to apply.
 * @returns {string} Queue evidence line for failed launches.
 */
function buildRunnerLaunchFailureQueueEvidence(failure) {
  return `${failure.beadId}: launch failed - ${failure.error}`;
}

/**
 * @param {{ beadId: string, summary: string }} outcome Runner outcome to apply.
 * @returns {string} Queue evidence line for blocked outcomes.
 */
function buildRunnerOutcomeQueueEvidence(outcome) {
  return `${outcome.beadId}: ${outcome.summary}`;
}

/**
 * Build the runner outcome event message for the tracker event log.
 * @param {{
 *   outcome: 'completed' | 'blocked',
 *   exitCode?: number | null,
 *   signal?: string | null,
 *   summary?: string | null,
 *   beadId?: string | null
 * }} outcome Runner outcome to render.
 * @returns {string} Human-readable event log entry.
 */
function buildRunnerOutcomeEventMessage(outcome) {
  if (outcome.outcome !== 'completed') {
    return formatAgentFailureEventMessage({
      exitCode: getOutcomeExitCode(outcome),
      signal: getOutcomeSignal(outcome),
      summary: getOutcomeSummary(outcome),
      beadId: outcome.beadId,
    });
  }

  return `bead closed: ${getBeadIdOrUnknown(outcome.beadId)}`;
}

/**
 * Normalize the exit code from a runner outcome payload.
 * @param {{ exitCode?: number | null }} outcome Runner outcome payload.
 * @returns {number | null} Exit code when present.
 */
function getOutcomeExitCode(outcome) {
  if (typeof outcome.exitCode === 'number') {
    return outcome.exitCode;
  }

  return null;
}

/**
 * Normalize the signal from a runner outcome payload.
 * @param {{ signal?: string | null }} outcome Runner outcome payload.
 * @returns {string | null} Signal when present.
 */
function getOutcomeSignal(outcome) {
  if (typeof outcome.signal === 'string') {
    return outcome.signal;
  }

  return null;
}

/**
 * Normalize the summary from a runner outcome payload.
 * @param {{ summary?: string | null }} outcome Runner outcome payload.
 * @returns {string | null} Summary when present.
 */
function getOutcomeSummary(outcome) {
  if (typeof outcome.summary === 'string') {
    return outcome.summary;
  }

  return null;
}

/**
 * Return the first non-empty failure message candidate.
 * @param {(string | null)[]} messages Candidate messages.
 * @returns {string | null} First usable message or null.
 */
function selectFirstFailureMessage(messages) {
  return messages.find(Boolean) ?? null;
}

/**
 * Build the signal-specific failure message, if any.
 * @param {string | null} signal Normalized signal.
 * @returns {string | null} Signal failure message or null.
 */
function formatAgentFailureSignalMessage(signal) {
  if (signal) {
    return `agent failure: signal ${signal}`;
  }

  return null;
}

/**
 * Build the exit-code-specific failure message, if any.
 * @param {number | null} exitCode Normalized exit code.
 * @returns {string | null} Exit-code failure message or null.
 */
function formatAgentFailureExitCodeMessage(exitCode) {
  if (typeof exitCode === 'number') {
    return `agent failure: exited ${exitCode}`;
  }

  return null;
}

/**
 * Build the summary-specific failure message, if any.
 * @param {string | null} summary Normalized summary.
 * @returns {string | null} Summary failure message or null.
 */
function formatAgentFailureSummaryMessage(summary) {
  const normalizedSummary = normalizeAgentFailureSummary(summary);
  if (normalizedSummary) {
    return `agent failure: ${normalizedSummary}`;
  }

  return null;
}

/**
 * Normalize a summary string for failure reporting.
 * @param {string | null} summary Raw summary value.
 * @returns {string | null} Normalized summary or null when empty.
 */
function normalizeAgentFailureSummary(summary) {
  const normalized = trimAgentFailureSummary(summary);
  if (!normalized) {
    return null;
  }

  return normalized;
}

/**
 * @param {string | null} summary Raw summary value.
 * @returns {string} Trimmed summary text.
 */
function trimAgentFailureSummary(summary) {
  return String(summary ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize a bead id, falling back to a safe default when missing.
 * @param {string | null | undefined} beadId Bead id when known.
 * @returns {string} Safe bead id value.
 */
function getBeadIdOrUnknown(beadId) {
  if (beadId) {
    return beadId;
  }

  return 'unknown bead';
}

/**
 * Format a failure message for a non-completed runner outcome.
 * @param {{
 *   exitCode: number | null,
 *   signal: string | null,
 *   summary: string | null,
 *   beadId: string | null | undefined
 * }} input Failure payload.
 * @returns {string} Human-readable failure message.
 */
function formatAgentFailureEventMessage({ exitCode, signal, summary, beadId }) {
  const message = selectFirstFailureMessage([
    formatAgentFailureSignalMessage(signal),
    formatAgentFailureExitCodeMessage(exitCode),
    formatAgentFailureSummaryMessage(summary),
  ]);

  if (message) {
    return message;
  }

  return `agent failure: ${getBeadIdOrUnknown(beadId)}`;
}

/**
 * Build the runner launch event log entry.
 * @param {{ beadId?: string | null }} launch Runner launch payload.
 * @returns {string} Human-readable launch event message.
 */
function buildBeadStartedEvent(launch) {
  return `bead started: ${launch.beadId ?? 'unknown bead'}`;
}

/**
 * Build the launch rejection event log entry.
 * @param {{ beadId?: string | null, error?: string | null }} failure Launch failure payload.
 * @returns {string} Human-readable launch rejection message.
 */
function buildLaunchRejectedEvent(failure) {
  const beadId = getBeadIdOrUnknown(failure.beadId);
  const error = failure.error ?? 'unknown error';
  return `launch rejected: ${beadId}: ${error}`;
}

/**
 * Append a new tracker event while keeping only the most recent entries.
 * @param {{ eventLog?: string[], [key: string]: unknown }} status Current tracker status.
 * @param {string} message Event log message to append.
 * @returns {Record<string, unknown>} Updated tracker status.
 */
function addSymphonyEvent(status, message) {
  const normalizedMessage = String(message).trim();
  const events = getEventLog(status);
  return {
    ...status,
    eventLog: [normalizedMessage, ...events].slice(0, MAX_EVENT_LOG_ENTRIES),
  };
}

/**
 * Read the existing event log from tracker status.
 * @param {{ eventLog?: string[] }} status Current tracker status.
 * @returns {string[]} Existing event log entries.
 */
function getEventLog(status) {
  if (Array.isArray(status.eventLog)) {
    return status.eventLog;
  }

  return [];
}
