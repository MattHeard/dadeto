#!/usr/bin/env node
import os from 'node:os';
import process from 'node:process';

const STATUS_URL = 'http://localhost:4322/api/symphony/status';
const LAUNCH_URL = 'http://localhost:4322/api/symphony/launch';
const REFRESH_MS = 5000;
const REFRESH_URL = 'http://localhost:4322/api/v1/refresh';
const AUTO_LOOP_INTERVAL_MS = 5000;
const RUN_COMPLETION_POLL_MS = 5000;
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
    const evidenceSlots = Math.max(
      MAX_LINES -
        lines.length -
        3 - // reserved for shortcut, launch, polling footer
        1, // evidence header line
      0
    );
    if (evidenceSlots > 0) {
      pushLine(lines, 'Evidence:');
      formatEvidenceLines(status.latestEvidence)
        .slice(0, evidenceSlots)
        .forEach((line) => pushLine(lines, line));
    }
  }
  const autoLoopLabel = autoLoopEnabled
    ? 'ON (press A to pause)'
    : 'OFF (press A to start)';
  pushLine(lines, highlightLine(formatField('Auto-loop', autoLoopLabel)));
  if (autoLoopFeedback) {
    pushLine(lines, clampLine(autoLoopFeedback));
  }
  if (statusFeedback) {
    pushLine(lines, clampLine(statusFeedback));
  }
  if (launchFeedback) {
    pushLine(lines, clampLine(`Launch: ${launchFeedback}`));
  }
  if (refreshFeedback) {
    pushLine(lines, clampLine(`Refresh: ${refreshFeedback}`));
  }
  pushLine(lines, `Polling every ${Math.floor(REFRESH_MS / 1000)} seconds.`);
  console.log(lines.join(os.EOL));
}

let timer;

async function refreshLoop() {
  try {
    const response = await fetch(STATUS_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = await response.json();
    lastSymphonyStatus = body;
    statusFeedback = '';
    renderStatus(body);
    return body;
  } catch (error) {
    lastSymphonyStatus = null;
    const message = error instanceof Error ? error.message : String(error);
    renderStatus(null);
    statusFeedback = `Status error: ${message}`;
    console.error('  ' + message);
    return null;
  }
}

let launchFeedback = 'Launch idle.';
let launchInFlight = false;
let refreshFeedback = '';
let refreshInFlight = false;
let statusFeedback = '';
let lastSymphonyStatus = null;
let autoLoopEnabled = false;
let autoLoopRunning = false;
let autoLoopTimer;
let autoLoopFeedback = '';

async function triggerLaunch({ label = 'Launch' } = {}) {
  if (launchInFlight) {
    launchFeedback = `${label} already in flight.`;
    return false;
  }

  launchInFlight = true;
  launchFeedback = `${label}...`;
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
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    launchFeedback = `${label} error: ${message}`;
    return false;
  } finally {
    launchInFlight = false;
  }
}

async function triggerRefresh({ label = 'Refresh' } = {}) {
  if (refreshInFlight) {
    refreshFeedback = `${label} already in flight.`;
    return false;
  }

  refreshInFlight = true;
  refreshFeedback = `${label}...`;
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

    refreshFeedback = `${label} queued.`;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    refreshFeedback = `${label} error: ${message}`;
    return false;
  } finally {
    refreshInFlight = false;
  }
}

function clearAutoLoopTimer() {
  if (autoLoopTimer) {
    clearTimeout(autoLoopTimer);
    autoLoopTimer = undefined;
  }
}

function scheduleAutoLoopCycle() {
  if (!autoLoopEnabled) {
    return;
  }
  clearAutoLoopTimer();
  autoLoopTimer = setTimeout(() => {
    autoLoopTimer = undefined;
    void runAutoLoopCycle();
  }, AUTO_LOOP_INTERVAL_MS);
}

async function runAutoLoopCycle() {
  if (!autoLoopEnabled || autoLoopRunning) {
    return;
  }
  autoLoopRunning = true;
  autoLoopFeedback = 'Auto loop running...';
  try {
    const refreshOk = await triggerRefresh({ label: 'Auto refresh' });
    if (!refreshOk) {
      autoLoopFeedback = 'Auto loop error: refresh failed.';
      return;
    }
    const refreshedStatus = await refreshLoop();
    const refreshedState = refreshedStatus?.state ?? 'unknown';
    if (refreshedState !== 'ready') {
      autoLoopFeedback = `Auto loop paused: Symphony state ${refreshedState}.`;
      return;
    }
    const launchOk = await triggerLaunch({ label: 'Auto launch' });
    if (!launchOk) {
      autoLoopFeedback = 'Auto loop error: launch failed.';
      return;
    }
    const postLaunchStatus = await refreshLoop();
    const launchedRunId = postLaunchStatus?.activeRun?.runId;
    await waitForActiveRunCompletion(launchedRunId);
    autoLoopFeedback = 'Auto loop cycle complete.';
  } finally {
    autoLoopRunning = false;
    if (autoLoopEnabled) {
      scheduleAutoLoopCycle();
    }
  }
}

async function waitForActiveRunCompletion(runId) {
  if (!runId) {
    return;
  }

  while (
    autoLoopEnabled &&
    lastSymphonyStatus?.activeRun?.runId === runId
  ) {
    autoLoopFeedback = `Auto loop waiting for ${runId} to finish...`;
    await new Promise((resolve) => setTimeout(resolve, RUN_COMPLETION_POLL_MS));
  }
}

function toggleAutoLoop() {
  autoLoopEnabled = !autoLoopEnabled;
  if (autoLoopEnabled) {
    autoLoopFeedback = 'Auto loop enabled.';
    void runAutoLoopCycle();
  } else {
    autoLoopFeedback = 'Auto loop paused.';
    clearAutoLoopTimer();
  }
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
      void triggerLaunch({ label: 'Manual launch' });
      return;
    }
    if (key === 'r' || key === 'R') {
      void triggerRefresh({ label: 'Manual refresh' });
      return;
    }
    if (key === 'a' || key === 'A') {
      toggleAutoLoop();
      return;
    }
    if (key === '\u0003') {
      clearInterval(timer);
      clearAutoLoopTimer();
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
    clearAutoLoopTimer();
    process.stdout.write(os.EOL);
    process.exit(0);
  });
  setupInput();
}

start();
