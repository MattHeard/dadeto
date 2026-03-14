#!/usr/bin/env node
import os from 'node:os';
import process from 'node:process';

const STATUS_URL = 'http://localhost:4322/api/symphony/status';
const LAUNCH_URL = 'http://localhost:4322/api/symphony/launch';
const REFRESH_URL = 'http://localhost:4322/api/v1/refresh';
const REFRESH_MS = 5000;
const MAX_WIDTH = 40;
const MAX_LINES = 10;
const ANSI_BOLD = '\u001b[1m';
const ANSI_RESET = '\u001b[0m';

if (typeof fetch !== 'function') {
  console.error('This tool needs a Node runtime that provides fetch.');
  process.exitCode = 1;
  process.exit();
}

const screen = {
  clear() {
    process.stdout.write('\u001b[2J\u001b[0;0H');
  },
};

function renderActiveRun(activeRun) {
  if (!activeRun) return 'none';
  if (typeof activeRun === 'string') return activeRun;
  const id = activeRun.id ?? activeRun.runId ?? activeRun.beadId ?? 'unknown';
  const state = activeRun.state ?? activeRun.status ?? 'unknown';
  return `${id} (${state})`;
}

function clampLine(text = '') {
  const line = String(text ?? '');
  if (line.length <= MAX_WIDTH) return line;
  if (MAX_WIDTH <= 3) return line.slice(0, MAX_WIDTH);
  return `${line.slice(0, MAX_WIDTH - 3)}...`;
}

function pushLine(lines, text = '') {
  if (lines.length >= MAX_LINES) return;
  lines.push(clampLine(text));
}

function highlightLine(text) {
  if (!text) return '';
  return `${ANSI_BOLD}${clampLine(text)}${ANSI_RESET}`;
}

function formatField(label, value) {
  const trimmedLabel = label.length > 10 ? label.slice(0, 10) : label;
  const available = Math.max(MAX_WIDTH - trimmedLabel.length - 2, 0);
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

function renderEventAndEvidence(status, lines, slots) {
  if (slots <= 0) {
    return;
  }

  let remaining = slots;
  const eventLines = formatEventLines(status.eventLog);
  const availableEventSlots = Math.max(remaining - 1, 0);
  const eventLinesToShow = eventLines.slice(0, availableEventSlots);

  if (eventLinesToShow.length > 0) {
    pushLine(lines, 'Events:');
    remaining -= 1;
    for (const eventLine of eventLinesToShow) {
      if (remaining <= 0) {
        break;
      }
      pushLine(lines, eventLine);
      remaining -= 1;
    }
  }

  if (remaining <= 0) {
    return;
  }

  const evidenceLines = formatEvidenceLines(status.latestEvidence);
  pushLine(lines, 'Evidence:');
  remaining -= 1;
  for (const evidenceLine of evidenceLines.slice(0, remaining)) {
    if (remaining <= 0) {
      break;
    }
    pushLine(lines, evidenceLine);
    remaining -= 1;
  }
}

function getRunId(activeRun) {
  if (!activeRun || typeof activeRun === 'string') {
    return null;
  }

  return activeRun.runId ?? activeRun.id ?? activeRun.beadId ?? null;
}

function getAutoLoopLabel() {
  if (!autoLoopEnabled) {
    return 'off';
  }

  return autoLoopPhase;
}

function renderStatus(status) {
  const lines = [];
  screen.clear();
  pushLine(lines, 'Symphony TUI (Ctrl+C to exit)');
  pushLine(lines, '-'.repeat(MAX_WIDTH));
  if (!status) {
    pushLine(lines, 'State: unreachable');
    pushLine(lines, "Start `npm run start:symphony`");
    pushLine(lines, 'Waiting for service (polls every 5s)');
  } else {
    pushLine(lines, formatField('State', status.state ?? 'unknown'));
    const beadId = status.currentBeadId ?? 'none';
    const beadTitle = status.currentBeadTitle ? ` - ${status.currentBeadTitle}` : '';
    const beadValue = `ID ${beadId}${beadTitle}`;
    pushLine(lines, highlightLine(formatField('Bead', beadValue)));
    pushLine(lines, formatField('Run', renderActiveRun(status.activeRun)));
    pushLine(
      lines,
      formatField('Rec', status.operatorRecommendation ?? 'none')
    );
    const footerLinesCount =
      2 +
      (launchFeedback ? 1 : 0) +
      (refreshFeedback ? 1 : 0) +
      (statusError ? 1 : 0);
    const availableSlots = Math.max(
      MAX_LINES - lines.length - footerLinesCount,
      0
    );
    renderEventAndEvidence(status, lines, availableSlots);
  }
  pushLine(lines, formatField('Auto', getAutoLoopLabel()));
  if (launchFeedback) {
    pushLine(lines, clampLine(`Launch: ${launchFeedback}`));
  }
  if (refreshFeedback) {
    pushLine(lines, clampLine(`Refresh: ${refreshFeedback}`));
  }
  if (statusError) {
    pushLine(lines, clampLine(`Status: ${statusError}`));
  }
  pushLine(lines, 'Polling every 5 seconds.');
  console.log(lines.join(os.EOL));
}

let timer;
let statusError = null;
let autoLoopEnabled = false;
let autoLoopInFlight = false;
let autoLoopPhase = 'idle';
let refreshFeedback = 'Press R to refresh.';
let refreshInFlight = false;

async function fetchStatus() {
  const response = await fetch(STATUS_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function refreshLoop() {
  try {
    const status = await fetchStatus();
    statusError = null;
    renderStatus(status);
    return status;
  } catch (error) {
    statusError = error instanceof Error ? error.message : String(error);
    renderStatus(null);
    console.error(`  ${statusError}`);
    return null;
  }
}

function wait(delayMs) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

async function waitForActiveRunCompletion(runId) {
  while (autoLoopEnabled) {
    autoLoopPhase = 'waiting';
    const status = await refreshLoop();
    if (getRunId(status?.activeRun) !== runId) {
      return true;
    }
    await wait(REFRESH_MS);
  }

  return false;
}

function scheduleNextAutoLoopCycle() {
  globalThis.setTimeout(() => {
    if (autoLoopEnabled) {
      void runAutoLoopCycle();
    }
  }, REFRESH_MS);
}

let launchFeedback = 'Press A for auto, L to launch.';
let launchInFlight = false;

async function triggerLaunch() {
  if (launchInFlight) {
    launchFeedback = 'Launch already in flight.';
    return;
  }

  launchInFlight = true;
  launchFeedback = 'Launching...';
  try {
    const response = await fetch(LAUNCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const rawBody = await response.text();
    if (!response.ok) {
      let message = rawBody;
      try {
        const json = JSON.parse(rawBody);
        message = json?.error ?? json?.message ?? message;
      } catch {
        // keep raw text fallback
      }
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
    const beadKey =
      payload?.currentBeadTitle ?? payload?.currentBeadId ?? 'next bead';
    launchFeedback = `Launched ${beadKey}.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    launchFeedback = `Launch error: ${message}`;
  } finally {
    launchInFlight = false;
  }
}

async function triggerRefresh() {
  if (refreshInFlight) {
    refreshFeedback = 'Refresh already in flight.';
    return;
  }

  refreshInFlight = true;
  refreshFeedback = 'Refreshing...';
  try {
    const response = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const rawBody = await response.text();
    if (!response.ok) {
      let message = rawBody;
      try {
        const json = JSON.parse(rawBody);
        message = json?.error ?? json?.message ?? message;
      } catch {
        // keep raw text fallback
      }
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }

    refreshFeedback =
      payload?.message ??
      payload?.status ??
      payload?.result ??
      'Refresh requested.';
    await refreshLoop();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    refreshFeedback = `Refresh error: ${message}`;
  } finally {
    refreshInFlight = false;
  }
}

async function runAutoLoopCycle() {
  if (!autoLoopEnabled || autoLoopInFlight || launchInFlight) {
    return;
  }

  autoLoopInFlight = true;
  try {
    autoLoopPhase = 'searching';
    const status = await refreshLoop();
    if (!autoLoopEnabled) {
      return;
    }
    if (!status) {
      scheduleNextAutoLoopCycle();
      return;
    }

    if (status.state !== 'ready') {
      launchFeedback = `Auto waiting for ${status.state ?? 'unknown'}.`;
      scheduleNextAutoLoopCycle();
      return;
    }

    await triggerLaunch();
    if (!autoLoopEnabled) {
      return;
    }

    const launchedStatus = await refreshLoop();
    const launchedRunId = getRunId(launchedStatus?.activeRun);
    if (!launchedRunId) {
      launchFeedback = 'Auto launch missing run id.';
      scheduleNextAutoLoopCycle();
      return;
    }

    const completed = await waitForActiveRunCompletion(launchedRunId);
    if (!completed || !autoLoopEnabled) {
      return;
    }

    autoLoopPhase = 'searching';
    scheduleNextAutoLoopCycle();
  } finally {
    autoLoopInFlight = false;
    if (!autoLoopEnabled) {
      autoLoopPhase = 'off';
    }
  }
}

function toggleAutoLoop() {
  autoLoopEnabled = !autoLoopEnabled;
  if (!autoLoopEnabled) {
    autoLoopPhase = 'off';
    launchFeedback = 'Auto loop disabled.';
    return;
  }

  autoLoopPhase = 'searching';
  launchFeedback = 'Auto loop enabled.';
  void runAutoLoopCycle();
}

function setupInput() {
  if (!process.stdin.isTTY) {
    return;
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (chunk) => {
    const key = chunk.toString('utf8');
    if (key === 'l' || key === 'L') {
      void triggerLaunch();
      return;
    }
    if (key === 'a' || key === 'A') {
      toggleAutoLoop();
      return;
    }
    if (key === 'r' || key === 'R') {
      void triggerRefresh();
      return;
    }
    if (key === '\u0003') {
      clearInterval(timer);
      process.stdout.write(os.EOL);
      process.exit(0);
    }
  });
}

function start() {
  refreshLoop();
  timer = setInterval(refreshLoop, REFRESH_MS);
  process.on('SIGINT', () => {
    clearInterval(timer);
    process.stdout.write(os.EOL);
    process.exit(0);
  });
  setupInput();
}

start();
