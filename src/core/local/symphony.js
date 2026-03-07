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
 * @param {{
 *   workflowExists: boolean,
  *   selectedBead: { id: string, title: string, priority: string } | null,
  *   lastCommand: string,
 *   pollResult: { readyCount: number, queueSummary?: string[] }
 * }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, queueEvidence: string[] }} Tracker selection status summary.
 */
function getReadySelectionSummary(input) {
  const queueEvidence = input.pollResult.queueSummary ?? [];
  return {
    state: 'ready',
    latestEvidence: `${input.lastCommand} selected ${input.selectedBead.id} from ${String(input.pollResult.readyCount)} ready bead(s): ${queueEvidence.join('; ')}.`,
    queueEvidence,
  };
}

/**
 * @returns {{ state: string, latestEvidence: string, queueEvidence: string[] }} Blocked tracker selection status summary.
 */
function getBlockedSelectionSummary() {
  return {
    state: 'blocked',
    latestEvidence:
      'WORKFLOW.md is missing; add it before enabling runner scheduling.',
    queueEvidence: [],
  };
}

/**
 * @param {{ lastCommand: string }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, queueEvidence: string[] }} Idle tracker selection status summary.
 */
function getIdleSelectionSummary(input) {
  return {
    state: 'idle',
    latestEvidence: `${input.lastCommand} found no ready beads.`,
    queueEvidence: [],
  };
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

  return input.selectedBead ? 'ready' : 'idle';
}

/**
 * @param {{
 *   workflowExists: boolean,
  *   selectedBead: { id: string, title: string, priority: string } | null,
  *   lastCommand: string,
 *   pollResult: { readyCount: number, queueSummary?: string[] }
 * }} input Tracker polling state.
 * @returns {{ state: string, latestEvidence: string, queueEvidence: string[] }} Tracker selection status summary.
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
