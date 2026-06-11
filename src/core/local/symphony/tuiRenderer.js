const BASE_WIDTH = 40;
const BASE_MAX_LINES = 10;
const ANSI_BOLD = '\u001b[1m';
const ANSI_RESET = '\u001b[0m';

/**
 * @typedef {object} TerminalSize
 * @property {number} [columns] Terminal column count.
 * @property {number} [rows] Terminal row count.
 */

/**
 * @typedef {object} RenderContext
 * @property {number} [columns] Terminal column count.
 * @property {number} [rows] Terminal row count.
 * @property {string} [version] UI version label.
 * @property {string} [autoLoopLabel] Auto-loop label.
 * @property {string} [launchFeedback] Launch status text.
 * @property {string} [refreshFeedback] Refresh status text.
 * @property {string} [statusError] Status error text.
 */

/**
 * Get the visible column count from a terminal size-like object.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {number} Non-negative column count.
 */
function getTerminalColumns(terminalSize = {}) {
  if (typeof terminalSize.columns === 'number') {
    return Math.max(0, terminalSize.columns);
  }

  return 0;
}

/**
 * Get the visible row count from a terminal size-like object.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {number} Non-negative row count.
 */
function getTerminalRows(terminalSize = {}) {
  if (typeof terminalSize.rows === 'number') {
    return Math.max(0, terminalSize.rows);
  }

  return 0;
}

/**
 * Get the maximum width for a rendered line.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {number} Maximum render width.
 */
function getMaxWidth(terminalSize = {}) {
  const columns = getTerminalColumns(terminalSize);
  if (columns <= 0) {
    return BASE_WIDTH;
  }

  return Math.max(BASE_WIDTH, columns);
}

/**
 * Get the maximum number of lines to render.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {number} Maximum line count.
 */
function getMaxLines(terminalSize = {}) {
  const rows = getTerminalRows(terminalSize);
  if (rows <= 0) {
    return BASE_MAX_LINES;
  }

  return Math.max(BASE_MAX_LINES, rows - 2);
}

/**
 * Clamp a line to the available width.
 * @param {string} text Line content.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {string} Clamped line content.
 */
function clampLine(text = '', terminalSize = {}) {
  const line = String(text ?? '');
  const maxWidth = getMaxWidth(terminalSize);
  if (line.length <= maxWidth) {
    return line;
  }
  if (maxWidth <= 3) {
    return line.slice(0, maxWidth);
  }
  return `${line.slice(0, maxWidth - 3)}...`;
}

/**
 * Append a clamped line if space remains.
 * @param {string[]} lines Accumulated lines.
 * @param {string} text Line content.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {void}
 */
function pushLine(lines, text = '', terminalSize = {}) {
  if (lines.length >= getMaxLines(terminalSize)) {
    return;
  }

  lines.push(clampLine(text, terminalSize));
}

/**
 * Highlight a line for display.
 * @param {string} text Line content.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {string} Highlighted line content.
 */
function highlightLine(text, terminalSize = {}) {
  if (!text) {
    return '';
  }

  return `${ANSI_BOLD}${clampLine(text, terminalSize)}${ANSI_RESET}`;
}

/**
 * Format a label/value pair for display.
 * @param {string} label Field label.
 * @param {unknown} value Field value.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {string} Rendered field text.
 */
function formatField(label, value, terminalSize = {}) {
  let trimmedLabel = label;
  if (label.length > 10) {
    trimmedLabel = label.slice(0, 10);
  }
  const available = Math.max(
    getMaxWidth(terminalSize) - trimmedLabel.length - 2,
    0
  );
  const normalizedValue = String(value ?? 'none').replace(/\s+/g, ' ');
  if (normalizedValue.length <= available) {
    return `${trimmedLabel}: ${normalizedValue}`;
  }
  if (available <= 0) {
    return `${trimmedLabel}:`;
  }

  let truncatedValue = normalizedValue.slice(0, available);
  if (available > 3) {
    truncatedValue = `${normalizedValue.slice(0, available - 3)}...`;
  }
  return `${trimmedLabel}: ${truncatedValue}`;
}

/**
 * Normalize evidence into a small renderable list.
 * @param {unknown} evidence Evidence payload.
 * @returns {unknown[]} Evidence items.
 */
function normalizeEvidenceItems(evidence) {
  if (!evidence) {
    return [];
  }

  if (Array.isArray(evidence)) {
    return evidence;
  }

  return [evidence];
}

/**
 * Format evidence entries for display.
 * @param {unknown} evidence Evidence payload.
 * @returns {string[]} Rendered evidence lines.
 */
function formatEvidenceLines(evidence) {
  const items = normalizeEvidenceItems(evidence);
  if (items.length === 0) {
    return ['  (none)'];
  }

  return formatIndexedLines(items.slice(0, 2), {
    prefix: '',
    indexOffset: 1,
    suffix: '',
  });
}

/**
 * Format event log entries for display.
 * @param {unknown} events Event log payload.
 * @returns {string[]} Rendered event lines.
 */
function formatEventLines(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  return formatIndexedLines(events, {
    prefix: 'E',
    indexOffset: 1,
    suffix: '>',
  });
}

/**
 * Format a list of indexed items with a common prefix/suffix pattern.
 * @param {unknown[]} items Items to render.
 * @param {{ prefix: string, indexOffset: number, suffix: string }} options Indexing options.
 * @returns {string[]} Rendered lines.
 */
function formatIndexedLines(items, options) {
  const lines = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let text = JSON.stringify(item);
    if (typeof item === 'string') {
      text = item;
    }
    lines.push(
      `${options.prefix}${index + options.indexOffset}${options.suffix} ${text.replace(/\s+/g, ' ')}`
    );
  }
  return lines;
}

/**
 * Render a labeled, bounded list section.
 * @param {{
 *   lines: string[],
 *   label: string,
 *   sectionLines: string[],
 *   remaining: number,
 *   terminalSize: TerminalSize
 * }} options Section render options.
 * @returns {number} Remaining slots after rendering.
 */
function renderBoundedSection(options) {
  const { lines, label, sectionLines, remaining, terminalSize } = options;
  if (sectionLines.length === 0 || remaining <= 0) {
    return remaining;
  }

  let nextRemaining = remaining;
  pushLine(lines, label, terminalSize);
  nextRemaining -= 1;

  for (const sectionLine of sectionLines) {
    if (nextRemaining <= 0) {
      return nextRemaining;
    }

    pushLine(lines, sectionLine, terminalSize);
    nextRemaining -= 1;
  }

  return nextRemaining;
}

/**
 * Render event and evidence sections into the current output.
 * @param {object} status Status payload.
 * @param {string[]} lines Accumulated lines.
 * @param {number} slots Remaining slots.
 * @param {TerminalSize} terminalSize Terminal size info.
 * @returns {void}
 */
function renderEventAndEvidence(status, lines, slots, terminalSize = {}) {
  if (slots <= 0) {
    return;
  }

  let remaining = slots;
  const eventLines = formatEventLines(status.eventLog);
  const availableEventSlots = Math.max(remaining - 1, 0);
  const eventLinesToShow = eventLines.slice(0, availableEventSlots);
  remaining = renderBoundedSection({
    lines,
    label: 'Events:',
    sectionLines: eventLinesToShow,
    remaining,
    terminalSize,
  });
  if (remaining <= 0) {
    return;
  }

  renderBoundedSection({
    lines,
    label: 'Evidence:',
    sectionLines: formatEvidenceLines(status.latestEvidence),
    remaining,
    terminalSize,
  });
}

/**
 * Resolve the queue summary to show in the renderer.
 * @param {object} status Status payload.
 * @returns {unknown[]} Queue summary entries.
 */
function getQueueSummary(status) {
  let pollSummary = [];
  if (Array.isArray(status?.lastPoll?.queueSummary)) {
    pollSummary = status.lastPoll.queueSummary;
  }

  if (pollSummary.length > 0) {
    return pollSummary;
  }

  if (Array.isArray(status?.queueEvidence) && status.queueEvidence.length > 0) {
    return status.queueEvidence;
  }

  return [];
}

/**
 * Decide how many slots to use for backlog rendering.
 * @param {number} totalSlots Total available slots.
 * @param {number} queueLength Queue entry count.
 * @param {number} maxLines Maximum render lines.
 * @returns {number} Slots assigned to backlog rendering.
 */
function calculateBacklogSlots(totalSlots, queueLength, maxLines) {
  if (totalSlots <= 0) {
    return 0;
  }

  const hasQueue = queueLength > 0;
  let minSlots = 1;
  if (hasQueue) {
    minSlots = 2;
  }
  if (totalSlots <= minSlots) {
    return Math.min(totalSlots, minSlots);
  }

  const extraCapacity = Math.max(0, totalSlots - minSlots);
  const extraRows = Math.max(0, maxLines - BASE_MAX_LINES);
  let maxExtraBacklog = 1;
  if (extraRows > 0) {
    maxExtraBacklog = Math.max(1, Math.floor(extraRows / 2));
  }
  let queueExtra = 0;
  if (hasQueue) {
    queueExtra = Math.min(queueLength - 1, extraCapacity);
  }
  const bonusSlots = Math.min(queueExtra, extraCapacity, maxExtraBacklog);

  return minSlots + bonusSlots;
}

/**
 * Render the queue backlog.
 * @param {{
 *   status: object,
 *   lines: string[],
 *   slots: number,
 *   queueSummary: unknown[],
 *   terminalSize?: TerminalSize
 * }} args Backlog render arguments.
 * @returns {number} Slots consumed.
 */
function renderBacklog(args) {
  const { status, lines, slots, queueSummary, terminalSize = {} } = args;
  if (slots <= 0) {
    return 0;
  }

  const readyCount = getReadyCount(status, queueSummary);

  pushLine(
    lines,
    formatField('Queue', `${readyCount} ready`, terminalSize),
    terminalSize
  );

  let used = 1;
  if (slots <= 1) {
    return used;
  }

  used += renderBacklogEntries(lines, queueSummary, slots, terminalSize);

  return used;
}

/**
 * Resolve the ready-count label for backlog rendering.
 * @param {object} status Status payload.
 * @param {unknown[]} queueSummary Queue summary entries.
 * @returns {number} Ready count.
 */
function getReadyCount(status, queueSummary) {
  if (typeof status?.lastPoll?.readyCount === 'number') {
    return status.lastPoll.readyCount;
  }

  return queueSummary.length;
}

/**
 * Render backlog entry lines.
 * @param {string[]} lines Output lines.
 * @param {unknown[]} queueSummary Queue summary entries.
 * @param {number} slots Available slots.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {number} Number of backlog entries rendered.
 */
function renderBacklogEntries(lines, queueSummary, slots, terminalSize) {
  const backlogEntries = queueSummary.slice(0, Math.max(0, slots - 1));
  let rendered = 0;
  for (
    let index = 0;
    index < backlogEntries.length && rendered + 1 < slots;
    index += 1
  ) {
    pushLine(
      lines,
      `B${index + 1}> ${clampLine(backlogEntries[index], terminalSize)}`,
      terminalSize
    );
    rendered += 1;
  }

  return rendered;
}

/**
 * Render the active run label.
 * @param {unknown} activeRun Active run payload.
 * @returns {string} Rendered active run label.
 */
function renderActiveRun(activeRun) {
  if (!activeRun) {
    return 'none';
  }

  if (typeof activeRun === 'string') {
    return activeRun;
  }

  const id = activeRun.id ?? activeRun.runId ?? activeRun.beadId ?? 'unknown';
  const state = activeRun.state ?? activeRun.status ?? 'unknown';
  return `${id} (${state})`;
}

/**
 * Render the top status block.
 * @param {{
 *   lines: string[],
 *   status: object,
 *   terminalSize: TerminalSize,
 *   serverVersion: string,
 *   context: RenderContext
 * }} args Status header arguments.
 * @returns {void}
 */
function renderStatusHeader(args) {
  const { lines, status, terminalSize, serverVersion, context } = args;
  const updateMessage = `Update: restart server or TUI for ${serverVersion}.`;
  pushLine(
    lines,
    formatField('State', status.state ?? 'unknown', terminalSize),
    terminalSize
  );
  pushLine(
    lines,
    formatField('SrvVer', serverVersion, terminalSize),
    terminalSize
  );
  pushLine(
    lines,
    formatField('TUIVer', context.version ?? 'unknown', terminalSize),
    terminalSize
  );

  if (serverVersion !== 'unknown' && serverVersion !== context.version) {
    pushLine(lines, clampLine(updateMessage, terminalSize), terminalSize);
  }

  const beadId = status.currentBeadId ?? 'none';
  pushLine(
    lines,
    highlightLine(formatField('Bead ID', beadId, terminalSize), terminalSize),
    terminalSize
  );

  if (status.currentBeadTitle) {
    pushLine(
      lines,
      formatField('Title', status.currentBeadTitle, terminalSize),
      terminalSize
    );
  }

  pushLine(
    lines,
    formatField('Run', renderActiveRun(status.activeRun), terminalSize),
    terminalSize
  );
  pushLine(
    lines,
    formatField('Rec', status.operatorRecommendation ?? 'none', terminalSize),
    terminalSize
  );
}

/**
 * Render the status footer block.
 * @param {string[]} lines Output lines.
 * @param {RenderContext} context Renderer context.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {void}
 */
function renderStatusFooter(lines, context, terminalSize) {
  pushLine(
    lines,
    formatField('Auto', context.autoLoopLabel ?? 'off', terminalSize),
    terminalSize
  );

  renderOptionalFooterLine(
    lines,
    'Launch:',
    context.launchFeedback,
    terminalSize
  );
  renderOptionalFooterLine(
    lines,
    'Refresh:',
    context.refreshFeedback,
    terminalSize
  );
  renderOptionalFooterLine(lines, 'Status:', context.statusError, terminalSize);

  pushLine(lines, 'Polling every 5 seconds.', terminalSize);
}

/**
 * Render an optional footer line.
 * @param {string[]} lines Output lines.
 * @param {string} label Line label.
 * @param {string | undefined} value Line value.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {void}
 */
function renderOptionalFooterLine(lines, label, value, terminalSize) {
  if (!value) {
    return;
  }

  pushLine(lines, clampLine(`${label} ${value}`, terminalSize), terminalSize);
}

/**
 * Render the no-status state.
 * @param {string[]} lines Output lines.
 * @param {TerminalSize} terminalSize Terminal size information.
 * @returns {void}
 */
function renderUnavailableStatus(lines, terminalSize) {
  pushLine(lines, 'State: unreachable', terminalSize);
  pushLine(lines, 'Start `npm run start:symphony`', terminalSize);
  pushLine(lines, 'Waiting for service (polls every 5s)', terminalSize);
}

/**
 * Build the full Symphony TUI line set.
 * @param {object | null | undefined} status Status payload.
 * @param {RenderContext} context Renderer context.
 * @returns {string[]} Rendered output lines.
 */
export function buildStatusLines(status, context = {}) {
  const terminalSize = {
    columns: context.columns,
    rows: context.rows,
  };
  const lines = [];
  pushLine(lines, 'Symphony TUI (Ctrl+C to exit)', terminalSize);
  pushLine(lines, '-'.repeat(getMaxWidth(terminalSize)), terminalSize);

  if (!status) {
    renderUnavailableStatus(lines, terminalSize);
    return lines;
  }

  const runtimeVersion = status.runtime?.version;
  let serverVersion = 'unknown';
  if (typeof runtimeVersion === 'string') {
    serverVersion = runtimeVersion;
  }

  renderStatusHeader({
    lines,
    status,
    terminalSize,
    serverVersion,
    context,
  });

  const footerLinesCount = 2;
  const maxLines = getMaxLines(terminalSize);
  const totalSlots = Math.max(maxLines - lines.length - footerLinesCount, 0);
  const queueSummary = getQueueSummary(status);
  const backlogSlots = calculateBacklogSlots(
    totalSlots,
    queueSummary.length,
    maxLines
  );
  const usedBacklogLines = renderBacklog({
    status,
    lines,
    slots: backlogSlots,
    queueSummary,
    terminalSize,
  });
  const remainingSlots = Math.max(totalSlots - usedBacklogLines, 0);
  renderEventAndEvidence(status, lines, remainingSlots, terminalSize);
  renderStatusFooter(lines, context, terminalSize);
  return lines;
}

/**
 * Create the Symphony TUI renderer wrapper handle.
 * @returns {{ buildStatusLines: typeof buildStatusLines }} Renderer exports.
 */
export function createSymphonyTuiRendererHandle() {
  return { buildStatusLines };
}
