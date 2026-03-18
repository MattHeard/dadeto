const BASE_WIDTH = 40;
const BASE_MAX_LINES = 10;
const ANSI_BOLD = '\u001b[1m';
const ANSI_RESET = '\u001b[0m';

function getTerminalColumns(terminalSize = {}) {
  if (typeof terminalSize.columns === 'number') {
    return Math.max(0, terminalSize.columns);
  }

  return 0;
}

function getTerminalRows(terminalSize = {}) {
  if (typeof terminalSize.rows === 'number') {
    return Math.max(0, terminalSize.rows);
  }

  return 0;
}

function getMaxWidth(terminalSize = {}) {
  const columns = getTerminalColumns(terminalSize);
  if (columns <= 0) {
    return BASE_WIDTH;
  }

  return Math.max(BASE_WIDTH, columns);
}

function getMaxLines(terminalSize = {}) {
  const rows = getTerminalRows(terminalSize);
  if (rows <= 0) {
    return BASE_MAX_LINES;
  }

  return Math.max(BASE_MAX_LINES, rows - 2);
}

function clampLine(text = '', terminalSize = {}) {
  const line = String(text ?? '');
  const maxWidth = getMaxWidth(terminalSize);
  if (line.length <= maxWidth) return line;
  if (maxWidth <= 3) return line.slice(0, maxWidth);
  return `${line.slice(0, maxWidth - 3)}...`;
}

function pushLine(lines, text = '', terminalSize = {}) {
  if (lines.length >= getMaxLines(terminalSize)) return;
  lines.push(clampLine(text, terminalSize));
}

function highlightLine(text, terminalSize = {}) {
  if (!text) return '';
  return `${ANSI_BOLD}${clampLine(text, terminalSize)}${ANSI_RESET}`;
}

function formatField(label, value, terminalSize = {}) {
  const trimmedLabel = label.length > 10 ? label.slice(0, 10) : label;
  const available = Math.max(getMaxWidth(terminalSize) - trimmedLabel.length - 2, 0);
  const normalizedValue = String(value ?? 'none').replace(/\s+/g, ' ');
  if (normalizedValue.length <= available) {
    return `${trimmedLabel}: ${normalizedValue}`;
  }
  if (available <= 0) {
    return `${trimmedLabel}:`;
  }
  const truncatedValue =
    available > 3
      ? `${normalizedValue.slice(0, available - 3)}...`
      : normalizedValue.slice(0, available);
  return `${trimmedLabel}: ${truncatedValue}`;
}

function formatEvidenceLines(evidence) {
  const items = evidence ? (Array.isArray(evidence) ? evidence : [evidence]) : [];
  if (items.length === 0) {
    return ['  (none)'];
  }
  return items.slice(0, 2).map((item, index) => {
    const text = typeof item === 'string' ? item : JSON.stringify(item);
    return `${index + 1}> ${text.replace(/\s+/g, ' ')}`;
  });
}

function formatEventLines(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  return events.map((event, index) => {
    const text = typeof event === 'string' ? event : JSON.stringify(event);
    return `E${index + 1}> ${text.replace(/\s+/g, ' ')}`;
  });
}

function renderEventAndEvidence(status, lines, slots, terminalSize = {}) {
  if (slots <= 0) {
    return;
  }

  let remaining = slots;
  const eventLines = formatEventLines(status.eventLog);
  const availableEventSlots = Math.max(remaining - 1, 0);
  const eventLinesToShow = eventLines.slice(0, availableEventSlots);

  if (eventLinesToShow.length > 0) {
    pushLine(lines, 'Events:', terminalSize);
    remaining -= 1;
    for (const eventLine of eventLinesToShow) {
      if (remaining <= 0) {
        break;
      }
      pushLine(lines, eventLine, terminalSize);
      remaining -= 1;
    }
  }

  if (remaining <= 0) {
    return;
  }

  const evidenceLines = formatEvidenceLines(status.latestEvidence);
  pushLine(lines, 'Evidence:', terminalSize);
  remaining -= 1;
  for (const evidenceLine of evidenceLines.slice(0, remaining)) {
    if (remaining <= 0) {
      break;
    }
    pushLine(lines, evidenceLine, terminalSize);
    remaining -= 1;
  }
}

function getQueueSummary(status) {
  const pollSummary = Array.isArray(status?.lastPoll?.queueSummary)
    ? status.lastPoll.queueSummary
    : [];
  if (pollSummary.length > 0) {
    return pollSummary;
  }

  if (Array.isArray(status?.queueEvidence) && status.queueEvidence.length > 0) {
    return status.queueEvidence;
  }

  return [];
}

function calculateBacklogSlots(totalSlots, queueLength, maxLines) {
  if (totalSlots <= 0) {
    return 0;
  }

  const hasQueue = queueLength > 0;
  const minSlots = hasQueue ? 2 : 1;
  if (totalSlots <= minSlots) {
    return Math.min(totalSlots, minSlots);
  }

  const extraCapacity = Math.max(0, totalSlots - minSlots);
  const extraRows = Math.max(0, maxLines - BASE_MAX_LINES);
  const maxExtraBacklog =
    extraRows > 0 ? Math.max(1, Math.floor(extraRows / 2)) : 1;
  const queueExtra = hasQueue ? Math.min(queueLength - 1, extraCapacity) : 0;
  const bonusSlots = Math.min(queueExtra, extraCapacity, maxExtraBacklog);

  return minSlots + bonusSlots;
}

function renderBacklog(status, lines, slots, queueSummary, terminalSize = {}) {
  if (slots <= 0) {
    return 0;
  }

  const readyCount =
    typeof status?.lastPoll?.readyCount === 'number'
      ? status.lastPoll.readyCount
      : queueSummary.length;
  pushLine(lines, formatField('Queue', `${readyCount} ready`, terminalSize), terminalSize);

  let used = 1;
  if (slots <= 1) {
    return used;
  }

  const backlogEntries = queueSummary.slice(0, Math.max(0, slots - 1));
  for (let index = 0; index < backlogEntries.length && used < slots; index += 1) {
    pushLine(
      lines,
      `B${index + 1}> ${clampLine(backlogEntries[index], terminalSize)}`,
      terminalSize
    );
    used += 1;
  }

  return used;
}

function renderActiveRun(activeRun) {
  if (!activeRun) return 'none';
  if (typeof activeRun === 'string') return activeRun;
  const id = activeRun.id ?? activeRun.runId ?? activeRun.beadId ?? 'unknown';
  const state = activeRun.state ?? activeRun.status ?? 'unknown';
  return `${id} (${state})`;
}

export function buildStatusLines(status, context = {}) {
  const terminalSize = {
    columns: context.columns,
    rows: context.rows,
  };
  const lines = [];
  pushLine(lines, 'Symphony TUI (Ctrl+C to exit)', terminalSize);
  pushLine(lines, '-'.repeat(getMaxWidth(terminalSize)), terminalSize);
  if (!status) {
    pushLine(lines, 'State: unreachable', terminalSize);
    pushLine(lines, 'Start `npm run start:symphony`', terminalSize);
    pushLine(lines, 'Waiting for service (polls every 5s)', terminalSize);
  } else {
    const serverVersion =
      typeof status.runtime?.version === 'string'
        ? status.runtime.version
        : 'unknown';
    pushLine(lines, formatField('State', status.state ?? 'unknown', terminalSize), terminalSize);
    pushLine(lines, formatField('SrvVer', serverVersion, terminalSize), terminalSize);
    pushLine(lines, formatField('TUIVer', context.version ?? 'unknown', terminalSize), terminalSize);
    if (serverVersion !== 'unknown' && serverVersion !== context.version) {
      pushLine(
        lines,
        clampLine(`Update: restart server or TUI for ${serverVersion}.`, terminalSize),
        terminalSize
      );
    }
    const beadId = status.currentBeadId ?? 'none';
    pushLine(
      lines,
      highlightLine(formatField('Bead ID', beadId, terminalSize), terminalSize),
      terminalSize
    );
    if (status.currentBeadTitle) {
      pushLine(lines, formatField('Title', status.currentBeadTitle, terminalSize), terminalSize);
    }
    pushLine(lines, formatField('Run', renderActiveRun(status.activeRun), terminalSize), terminalSize);
    pushLine(lines, formatField('Rec', status.operatorRecommendation ?? 'none', terminalSize), terminalSize);
    const footerLinesCount = 2;
    const maxLines = getMaxLines(terminalSize);
    const totalSlots = Math.max(maxLines - lines.length - footerLinesCount, 0);
    const queueSummary = getQueueSummary(status);
    const backlogSlots = calculateBacklogSlots(totalSlots, queueSummary.length, maxLines);
    const usedBacklogLines = renderBacklog(
      status,
      lines,
      backlogSlots,
      queueSummary,
      terminalSize
    );
    const remainingSlots = Math.max(totalSlots - usedBacklogLines, 0);
    renderEventAndEvidence(status, lines, remainingSlots, terminalSize);
  }
  pushLine(lines, formatField('Auto', context.autoLoopLabel ?? 'off', terminalSize), terminalSize);
  if (context.launchFeedback) {
    pushLine(lines, clampLine(`Launch: ${context.launchFeedback}`, terminalSize), terminalSize);
  }
  if (context.refreshFeedback) {
    pushLine(lines, clampLine(`Refresh: ${context.refreshFeedback}`, terminalSize), terminalSize);
  }
  if (context.statusError) {
    pushLine(lines, clampLine(`Status: ${context.statusError}`, terminalSize), terminalSize);
  }
  pushLine(lines, 'Polling every 5 seconds.', terminalSize);
  return lines;
}
