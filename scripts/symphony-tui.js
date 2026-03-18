#!/usr/bin/env node
import os from 'node:os';
import process from 'node:process';
import { getSymphonyRuntimeVersion } from '../src/local/symphony/runtimeVersion.js';
import { buildStatusLines } from '../src/local/symphony/tuiRenderer.js';

const STATUS_URL = 'http://localhost:4322/api/symphony/status';
const LAUNCH_URL = 'http://localhost:4322/api/symphony/launch';
const REFRESH_URL = 'http://localhost:4322/api/v1/refresh';
const REFRESH_MS = 5000;
const TUI_VERSION = getSymphonyRuntimeVersion({ repoRoot: process.cwd() });

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
  screen.clear();
  const lines = buildStatusLines(status, {
    columns: process.stdout?.columns,
    rows: process.stdout?.rows,
    version: TUI_VERSION,
    autoLoopLabel: getAutoLoopLabel(),
    launchFeedback,
    refreshFeedback,
    statusError,
  });
  console.log(lines.join(os.EOL));
}

let timer;
let statusError = null;
let autoLoopEnabled = false;
let autoLoopInFlight = false;
let autoLoopPhase = 'idle';
let refreshFeedback = '';
let refreshInFlight = false;
let launchFeedback = '';
let launchInFlight = false;

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
    const status = await triggerRefresh();
    if (!status) {
      await wait(REFRESH_MS);
      continue;
    }

    if (getRunId(status.activeRun) !== runId) {
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
    return null;
  }

  refreshInFlight = true;
  refreshFeedback = 'Refreshing...';
  let refreshedStatus = null;
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
    refreshedStatus = await refreshLoop();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    refreshFeedback = `Refresh error: ${message}`;
  } finally {
    refreshInFlight = false;
  }
  return refreshedStatus;
}

async function runAutoLoopCycle() {
  if (!autoLoopEnabled || autoLoopInFlight || launchInFlight) {
    return;
  }

  autoLoopInFlight = true;
  try {
    autoLoopPhase = 'searching';
    const status = await triggerRefresh();
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
