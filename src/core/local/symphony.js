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
    .filter(Boolean);
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
 *   selectedBead: { id: string, title: string, priority: string } | null,
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
  const selectionSummaries = {
    blocked: () => getBlockedSelectionSummary(),
    idle: () => getIdleSelectionSummary(input),
    ready: () =>
      getReadySelectionSummary(
        /** @type {typeof input & { selectedBead: { id: string, title: string, priority: string } }} */ (
          input
        )
      ),
  };

  return selectionSummaries[getSelectionStateKey(input)]();
}
