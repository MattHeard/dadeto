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
  if (selectionStateKey === 'blocked') {
    return getBlockedSelectionSummary();
  }

  if (selectionStateKey === 'idle') {
    return getIdleSelectionSummary(input);
  }

  return getReadySelectionSummary({
    ...input,
    selectedBead:
      /** @type {{ id: string, title: string, priority: string }} */ (
        input.selectedBead
      ),
  });
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
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string
 * }} launch Runner launch to apply.
 * @returns {Record<string, unknown>} Updated scheduler-visible status.
 */
export function applyRunnerLaunch(status, launch) {
  return {
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
  return {
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
  return {
    ...status,
    state: 'idle',
    currentBeadId: null,
    currentBeadTitle: null,
    currentBeadPriority: null,
    latestEvidence: buildRunnerOutcomeEvidence('completed', outcome),
    operatorRecommendation:
      'Refresh the queue and choose the next ready bead before launching another runner loop.',
    queueEvidence: [],
    lastOutcome: {
      beadId: outcome.beadId,
      beadTitle: outcome.beadTitle ?? null,
      outcome: outcome.outcome,
      summary: outcome.summary,
    },
  };
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @param {{ beadId: string, beadTitle?: string, outcome: 'completed' | 'blocked', summary: string }} outcome
 *   Runner outcome to apply.
 * @returns {Record<string, unknown>} Updated status after a blocked runner handoff.
 */
function buildBlockedOutcomeStatus(status, outcome) {
  return {
    ...status,
    state: 'blocked',
    latestEvidence: buildRunnerOutcomeEvidence('blocked', outcome),
    operatorRecommendation:
      'Inspect the blocker, update the bead or workflow guidance, and only then launch another runner loop.',
    queueEvidence: [buildRunnerOutcomeQueueEvidence(outcome)],
    lastOutcome: {
      beadId: outcome.beadId,
      beadTitle: outcome.beadTitle ?? null,
      outcome: outcome.outcome,
      summary: outcome.summary,
    },
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
 *   args?: string[] | null,
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
    runId: launch.runId,
    startedAt: launch.startedAt,
    beadId: launch.beadId,
    beadTitle: getLaunchTextField(launch.beadTitle),
    beadPriority: getLaunchTextField(launch.beadPriority),
    launchRequest: launch.launchRequest,
    outcome: 'started',
    launcherKind: getLaunchTextField(launch.launcherKind),
    command: getLaunchTextField(launch.command),
    args: getLaunchArgs(launch.args),
    pid: getLaunchPid(launch.pid),
    stdoutPath: getLaunchTextField(launch.stdoutPath),
    stderrPath: getLaunchTextField(launch.stderrPath),
  };
}

/**
 * @param {{
 *   runId: string,
 *   startedAt: string,
 *   beadId: string,
 *   beadTitle?: string | null,
 *   beadPriority?: string | null,
 *   launchRequest: string
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
    state: 'running',
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
