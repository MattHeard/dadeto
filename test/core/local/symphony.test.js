import {
  parseReadyBeads,
  selectNextBead,
  summarizeReadyBeadQueue,
  summarizeTrackerSelection,
} from '../../../src/core/local/symphony.js';

describe('core local symphony helpers', () => {
  test('parses ready bead rows from bd output', () => {
    const readyBeads = parseReadyBeads(`
📋 Ready work (2 issues with no blockers):

1. [● P2] [task] dadeto-639o: Implement Symphony tracker polling and bead selection loop
2. [● P3] [task] dadeto-abcd: Follow-up
`);

    expect(readyBeads).toEqual([
      {
        id: 'dadeto-639o',
        priority: '● P2',
        title: 'Implement Symphony tracker polling and bead selection loop',
      },
      {
        id: 'dadeto-abcd',
        priority: '● P3',
        title: 'Follow-up',
      },
    ]);
  });

  test('selects the first ready bead', () => {
    expect(
      selectNextBead([
        { id: 'dadeto-639o', title: 'First', priority: '● P2' },
        { id: 'dadeto-abcd', title: 'Second', priority: '● P3' },
      ])
    ).toEqual({ id: 'dadeto-639o', title: 'First', priority: '● P2' });
    expect(selectNextBead([])).toBeNull();
  });

  test('summarizes ready bead queue for operator evidence', () => {
    expect(
      summarizeReadyBeadQueue([
        { id: 'dadeto-639o', title: 'First', priority: '● P2' },
        { id: 'dadeto-abcd', title: 'Second', priority: '● P3' },
      ])
    ).toEqual([
      'dadeto-639o (● P2) First',
      'dadeto-abcd (● P3) Second',
    ]);
  });

  test('summarizes ready and idle tracker states', () => {
    expect(
      summarizeTrackerSelection({
        workflowExists: true,
        selectedBead: { id: 'dadeto-639o', title: 'First', priority: '● P2' },
        lastCommand: 'bd ready --sort priority',
        pollResult: {
          readyCount: 2,
          queueSummary: ['dadeto-639o (● P2) First', 'dadeto-abcd (● P3) Second'],
        },
      })
    ).toEqual({
      state: 'ready',
      latestEvidence:
        'bd ready --sort priority selected dadeto-639o from 2 ready bead(s): dadeto-639o (● P2) First; dadeto-abcd (● P3) Second.',
      queueEvidence: [
        'dadeto-639o (● P2) First',
        'dadeto-abcd (● P3) Second',
      ],
    });

    expect(
      summarizeTrackerSelection({
        workflowExists: true,
        selectedBead: null,
        lastCommand: 'bd ready --sort priority',
        pollResult: { readyCount: 0 },
      })
    ).toEqual({
      state: 'idle',
      latestEvidence: 'bd ready --sort priority found no ready beads.',
      queueEvidence: [],
    });
  });
});
