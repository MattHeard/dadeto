import { buildStatusLines } from '../../src/local/symphony/tuiRenderer.js';

describe('symphony tui renderer', () => {
  test('uses extra terminal width and height when available', () => {
    const status = {
      state: 'ready',
      runtime: { version: '1.0.0' },
      currentBeadId: 'dadeto-rmlb',
      currentBeadTitle:
        'Make the Symphony TUI expand to the available terminal width and height',
      activeRun: { runId: 'run-123', state: 'running' },
      operatorRecommendation: 'Keep the compact fallback intact.',
      lastPoll: {
        readyCount: 3,
        queueSummary: ['first bead', 'second bead', 'third bead'],
      },
      eventLog: ['launch started', 'queue refreshed'],
      latestEvidence: ['evidence line one', 'evidence line two'],
    };

    const compact = buildStatusLines(status, {
      columns: 40,
      rows: 10,
      version: '1.0.0',
      autoLoopLabel: 'off',
    });
    const expanded = buildStatusLines(status, {
      columns: 96,
      rows: 24,
      version: '1.0.0',
      autoLoopLabel: 'off',
    });

    expect(compact.length).toBeLessThan(expanded.length);
    expect(expanded.some((line) => line.length > 40)).toBe(true);
    expect(compact.every((line) => line.length <= 40)).toBe(true);
  });
});
