import {
  buildStatusLines,
  createSymphonyTuiRendererHandle,
  tuiRendererTestUtils,
} from '../../../src/core/local/symphony/tuiRenderer.js';

describe('core Symphony TUI renderer', () => {
  test('covers primitive renderer helpers with default and boundary inputs', () => {
    const {
      getTerminalColumns,
      getTerminalRows,
      getMaxWidth,
      getMaxLines,
      clampLine,
      pushLine,
      highlightLine,
      formatField,
      normalizeEvidenceItems,
      renderEventAndEvidence,
      renderBacklog,
      calculateBacklogSlots,
    } = tuiRendererTestUtils;

    expect(getTerminalColumns()).toBe(0);
    expect(getTerminalColumns({ columns: -2 })).toBe(0);
    expect(getTerminalRows()).toBe(0);
    expect(getTerminalRows({ rows: -2 })).toBe(0);
    expect(getMaxWidth()).toBe(40);
    expect(getMaxLines()).toBe(10);
    expect(clampLine()).toBe('');
    expect(clampLine(null, { columns: 40 })).toBe('');
    expect(clampLine('x'.repeat(50), { columns: 40 })).toHaveLength(40);
    const lines = [];
    pushLine(lines);
    expect(lines).toEqual(['']);
    expect(highlightLine('x')).toContain('x');
    expect(formatField('Long label', 'value')).toBe('Long label: value');
    expect(formatField('State', null)).toBe('State: none');
    expect(formatField('State', 'line\nwith spaces')).toBe(
      'State: line with spaces'
    );
    expect(normalizeEvidenceItems()).toEqual([]);
    expect(normalizeEvidenceItems('one')).toEqual(['one']);
    expect(normalizeEvidenceItems(['one'])).toEqual(['one']);
    expect(
      renderBacklog({ status: {}, lines: [], slots: 0, queueSummary: [] })
    ).toBe(0);
    expect(renderEventAndEvidence({}, [], 0)).toBeUndefined();
    expect(calculateBacklogSlots(5, 0, 20)).toBe(1);
    expect(calculateBacklogSlots(5, 0, 10)).toBe(1);
    expect(calculateBacklogSlots(5, 3, 20)).toBe(4);
  });

  test('renders the unavailable state and exposes the handle', () => {
    expect(createSymphonyTuiRendererHandle().buildStatusLines).toBe(
      buildStatusLines
    );
    expect(buildStatusLines()).toEqual([
      'Symphony TUI (Ctrl+C to exit)',
      '-'.repeat(40),
      'State: unreachable',
      'Start `npm run start:symphony`',
      'Waiting for service (polls every 5s)',
    ]);
  });

  test('renders version changes, active runs, recommendations, and footer feedback', () => {
    const lines = buildStatusLines(
      {
        state: 'running',
        runtime: { version: 'server-2' },
        currentBeadId: 'dadeto-123',
        currentBeadTitle: 'A bead title',
        activeRun: { id: 'run-1', state: 'active' },
        operatorRecommendation: 'Continue polling',
        lastPoll: { readyCount: 2, queueSummary: ['one', 'two'] },
        eventLog: ['started', { kind: 'updated', value: 2 }],
        latestEvidence: [{ command: 'npm test' }],
      },
      {
        columns: 80,
        rows: 24,
        version: 'tui-1',
        autoLoopLabel: 'on',
        launchFeedback: 'launched',
        refreshFeedback: 'refreshed',
        statusError: 'none',
      }
    );

    expect(lines.join('\n')).toContain(
      'Update: restart server or TUI for server-2.'
    );
    expect(lines.join('\n')).toContain('run-1 (active)');
    expect(lines.join('\n')).toContain('B1> one');
    expect(lines.join('\n')).toContain('E1> started');
    expect(lines.join('\n')).toContain('Evidence:');
    expect(lines.join('\n')).toContain('Auto: on');
    expect(lines.join('\n')).toContain('Launch: launched');
    expect(lines.join('\n')).toContain('Refresh: refreshed');
    expect(lines.join('\n')).toContain('Status: none');
  });

  test('uses fallbacks for missing values and queue evidence', () => {
    const lines = buildStatusLines(
      {
        state: null,
        runtime: { version: 42 },
        activeRun: 'run-string',
        queueEvidence: ['fallback queue'],
        latestEvidence: ['one', 'two', 'three'],
        eventLog: [],
      },
      { columns: 40, rows: 24 }
    );

    expect(lines.join('\n')).toContain('State: unknown');
    expect(lines.join('\n')).toContain('SrvVer: unknown');
    expect(lines.join('\n')).toContain('run-string');
    expect(lines.join('\n')).toContain('B1> fallback queue');
    expect(lines.join('\n')).toContain('Evidence:');
    expect(lines.join('\n')).toContain('1 one');
  });

  test('handles narrow values, unknown active runs, and empty evidence', () => {
    const lines = buildStatusLines(
      {
        state: 'x'.repeat(100),
        currentBeadId: 'id'.repeat(100),
        currentBeadTitle: 'title'.repeat(100),
        activeRun: {},
        latestEvidence: null,
        eventLog: 'not-an-array',
      },
      { columns: 40, rows: 24, version: 'v' }
    );

    expect(lines.join('\n')).toContain('unknown (unknown)');
    expect(lines.join('\n')).toContain('Evidence:');
    expect(lines.join('\n')).toContain('(none)');
    expect(lines.every(line => line.length <= 40)).toBe(true);
  });

  test('limits output when the terminal has no available rows', () => {
    const lines = buildStatusLines(
      { state: 'ready', runtime: { version: 'v' } },
      { columns: 0, rows: 1 }
    );
    expect(lines.length).toBe(10);
    expect(lines.every(line => line.length <= 40)).toBe(true);
  });

  test('exhausts event slots and uses the minimal backlog allocation', () => {
    const lines = buildStatusLines(
      {
        state: 'ready',
        runtime: { version: 'server' },
        eventLog: ['first', 'second'],
        queueEvidence: ['queued'],
      },
      { columns: 40, rows: 10, version: 'tui' }
    );
    expect(lines.length).toBe(10);

    const evidenceLines = buildStatusLines(
      {
        state: 'ready',
        runtime: { version: 'server' },
        latestEvidence: ['one', 'two'],
      },
      { columns: 40, rows: 16, version: 'different' }
    );
    expect(evidenceLines.join('\n')).toContain('Evidence:');

    const eventLines = buildStatusLines(
      {
        state: 'ready',
        runtime: { version: 'server' },
        eventLog: ['one', 'two'],
      },
      { columns: 40, rows: 16, version: 'different' }
    );
    expect(eventLines.some(line => line.includes('Events:'))).toBe(true);

    const objectEvidenceLines = buildStatusLines(
      { state: 'ready', latestEvidence: { command: 'check' } },
      { columns: 40, rows: 24 }
    );
    expect(objectEvidenceLines.join('\n')).toContain('command');

    const minimalBacklogLines = buildStatusLines(
      {
        state: 'ready',
        runtime: { version: 'server' },
        queueEvidence: ['queued'],
      },
      { columns: 40, rows: 15, version: 'different' }
    );
    expect(minimalBacklogLines.join('\n')).toContain('Queue:');
  });
});
