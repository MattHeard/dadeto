#!/usr/bin/env node
import os from 'node:os';
import process from 'node:process';

const STATUS_URL = 'http://localhost:4322/api/symphony/status';
const REFRESH_MS = 5000;
const MAX_WIDTH = 40;
const MAX_LINES = 10;

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
    pushLine(
      lines,
      formatField(
        'Bead',
        status.currentBeadTitle ?? status.currentBeadId ?? 'none'
      )
    );
    pushLine(lines, formatField('Run', renderActiveRun(status.activeRun)));
    pushLine(
      lines,
      formatField('Rec', status.operatorRecommendation ?? 'none')
    );
    pushLine(lines, 'Evidence:');
    formatEvidenceLines(status.latestEvidence).forEach((line) =>
      pushLine(lines, line)
    );
  }
  pushLine(lines, 'Polling every 5 seconds.');
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
    renderStatus(body);
  } catch (error) {
    renderStatus(null);
    console.error('  ' + (error instanceof Error ? error.message : String(error)));
  }
}

function start() {
  refreshLoop();
  timer = setInterval(refreshLoop, REFRESH_MS);
  process.on('SIGINT', () => {
    clearInterval(timer);
    process.stdout.write(os.EOL);
    process.exit(0);
  });
}

start();
