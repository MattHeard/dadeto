import {
  buildStatusLines,
  createSymphonyTuiRendererHandle,
  tuiRendererTestUtils as u,
} from '../../src/core/local/symphony/tuiRenderer.js';

test('covers renderer fallbacks and bounded helper paths', () => {
  expect(u.getTerminalColumns()).toBe(0);
  expect(u.getTerminalColumns({ columns: -2 })).toBe(0);
  expect(u.getTerminalRows()).toBe(0);
  expect(u.getTerminalRows({ rows: -2 })).toBe(0);
  expect(u.getMaxWidth({ columns: 20 })).toBe(40);
  expect(u.getMaxWidth({})).toBe(40);
  expect(u.getMaxWidth()).toBe(40);
  expect(u.getMaxLines({ rows: 5 })).toBe(10);
  expect(u.getMaxLines({})).toBe(10);
  expect(u.getMaxLines()).toBe(10);
  expect(u.clampLine('x'.repeat(50), { columns: 40 })).toHaveLength(40);
  expect(u.clampLine(null)).toBe('');
  expect(u.clampLine()).toBe('');
  const lines = Array.from({ length: 10 }, () => 'existing');
  u.pushLine(lines, 'full', { rows: 1 });
  u.pushLine([], undefined, {});
  u.pushLine([]);
  expect(lines).toHaveLength(10);
  expect(u.highlightLine('hello')).toContain('hello');
  expect(
    u.formatField('LongLabelValue', 'x'.repeat(50), { columns: 40 })
  ).toContain('...');
  expect(u.formatField('x', 'short', { columns: 40 })).toBe('x: short');
  expect(u.formatField('x', 'short')).toBe('x: short');
  expect(u.formatField('x', null)).toContain('none');
  expect(u.normalizeEvidenceItems()).toEqual([]);
  expect(u.normalizeEvidenceItems('one')).toEqual(['one']);
  expect(u.normalizeEvidenceItems(['one'])).toEqual(['one']);
  expect(u.calculateBacklogSlots(0, 0, 10)).toBe(0);
  expect(u.calculateBacklogSlots(1, 0, 10)).toBe(1);
  expect(u.calculateBacklogSlots(2, 2, 10)).toBe(2);
  expect(u.calculateBacklogSlots(8, 3, 24)).toBeGreaterThan(2);
  expect(u.calculateBacklogSlots(8, 3, 10)).toBeGreaterThan(0);
  expect(
    u.renderBacklog({ status: {}, lines: [], slots: 1, queueSummary: [] })
  ).toBe(1);
  expect(u.renderActiveRun()).toBe('none');
  expect(u.renderActiveRun({ runId: 'r', status: 'done' })).toBe('r (done)');
  expect(u.renderActiveRun({ beadId: 'b' })).toBe('b (unknown)');
  expect(u.renderActiveRun({ state: 'queued' })).toBe('unknown (queued)');
  expect(u.renderActiveRun({})).toBe('unknown (unknown)');
  const bounded = [];
  expect(
    u.renderBoundedSection({
      lines: bounded,
      label: 'L',
      sectionLines: [],
      remaining: 2,
      terminalSize: {},
    })
  ).toBe(2);
  expect(
    u.renderBoundedSection({
      lines: bounded,
      label: 'L',
      sectionLines: ['a', 'b'],
      remaining: 0,
      terminalSize: {},
    })
  ).toBe(0);
  expect(
    u.renderBoundedSection({
      lines: bounded,
      label: 'L',
      sectionLines: ['a', 'b'],
      remaining: 2,
      terminalSize: {},
    })
  ).toBe(0);
  u.renderEventAndEvidence(
    { eventLog: [], latestEvidence: undefined },
    [],
    0,
    {}
  );
  u.renderEventAndEvidence(
    { eventLog: [], latestEvidence: undefined },
    [],
    2,
    {}
  );
  u.renderEventAndEvidence({ eventLog: ['a'], latestEvidence: 'b' }, [], 2, {});
  u.renderEventAndEvidence({ eventLog: ['a'], latestEvidence: 'b' }, [], 1, {});
  u.renderEventAndEvidence({ eventLog: [], latestEvidence: 'b' }, []);

  expect(buildStatusLines(null, { columns: 40, rows: 10 })).toContain(
    'State: unreachable'
  );
  buildStatusLines({}, { columns: 96, rows: 30, version: '2.0.0' });
  buildStatusLines({ runtime: { version: '1.0.0' } });
  const status = {
    state: undefined,
    runtime: { version: '1.0.0' },
    activeRun: 'run-string',
    queueEvidence: ['fallback queue'],
    eventLog: [null, { detail: 'event' }],
    latestEvidence: undefined,
  };
  const rendered = buildStatusLines(status, {
    columns: 96,
    rows: 30,
    launchFeedback: 'launched',
    refreshFeedback: 'refreshed',
    statusError: 'failed once',
    version: '2.0.0',
  });
  expect(rendered.join('\n')).toContain('run-string');
  expect(createSymphonyTuiRendererHandle().buildStatusLines).toBe(
    buildStatusLines
  );
});
