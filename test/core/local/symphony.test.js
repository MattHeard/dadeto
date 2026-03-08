import {
  applyRunnerOutcome,
  buildSelectedBeadStatus,
  parseReadyBeads,
  selectNextBead,
  summarizePollResult,
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
    ).toEqual(['dadeto-639o (● P2) First', 'dadeto-abcd (● P3) Second']);
  });

  test('builds selected bead top-level status fields', () => {
    expect(
      buildSelectedBeadStatus({
        id: 'dadeto-639o',
        title: 'First',
        priority: '● P2',
      })
    ).toEqual({
      currentBeadId: 'dadeto-639o',
      currentBeadTitle: 'First',
      currentBeadPriority: '● P2',
    });

    expect(buildSelectedBeadStatus(null)).toEqual({
      currentBeadId: null,
      currentBeadTitle: null,
      currentBeadPriority: null,
    });
  });

  test('summarizes poll results for compact status output', () => {
    expect(
      summarizePollResult({
        readyCount: 2,
        queueSummary: ['dadeto-639o (● P2) First', 'dadeto-abcd (● P3) Second'],
      })
    ).toBe(
      '2 ready bead(s): dadeto-639o (● P2) First; dadeto-abcd (● P3) Second'
    );

    expect(
      summarizePollResult({
        readyCount: 0,
        queueSummary: [],
      })
    ).toBe('0 ready bead(s)');
  });

  test('summarizes ready and idle tracker states', () => {
    expect(
      summarizeTrackerSelection({
        workflowExists: true,
        selectedBead: { id: 'dadeto-639o', title: 'First', priority: '● P2' },
        lastCommand: 'bd ready --sort priority',
        pollResult: {
          readyCount: 2,
          queueSummary: [
            'dadeto-639o (● P2) First',
            'dadeto-abcd (● P3) Second',
          ],
        },
      })
    ).toEqual({
      state: 'ready',
      latestEvidence:
        'bd ready --sort priority selected dadeto-639o from 2 ready bead(s): dadeto-639o (● P2) First; dadeto-abcd (● P3) Second.',
      operatorRecommendation: 'Run the next worker loop on dadeto-639o.',
      queueEvidence: ['dadeto-639o (● P2) First', 'dadeto-abcd (● P3) Second'],
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
      operatorRecommendation:
        'Create or refresh the next bead before starting another runner loop.',
      queueEvidence: [],
    });
  });

  test('applies completed and blocked runner outcomes to scheduler-visible state', () => {
    expect(
      applyRunnerOutcome(
        {
          state: 'ready',
          currentBeadId: 'dadeto-639o',
          currentBeadTitle: 'First',
          currentBeadPriority: '● P2',
          queueEvidence: ['dadeto-639o (● P2) First'],
        },
        {
          beadId: 'dadeto-639o',
          beadTitle: 'First',
          outcome: 'completed',
          summary: 'Closed bead and pushed changes.',
        }
      )
    ).toMatchObject({
      state: 'idle',
      currentBeadId: null,
      currentBeadTitle: null,
      currentBeadPriority: null,
      latestEvidence:
        'Runner completed dadeto-639o: Closed bead and pushed changes.',
      operatorRecommendation:
        'Refresh the queue and choose the next ready bead before launching another runner loop.',
      queueEvidence: [],
      lastOutcome: {
        beadId: 'dadeto-639o',
        beadTitle: 'First',
        outcome: 'completed',
        summary: 'Closed bead and pushed changes.',
      },
    });

    expect(
      applyRunnerOutcome(
        {
          state: 'ready',
          currentBeadId: 'dadeto-abcd',
          currentBeadTitle: 'Blocked bead',
          currentBeadPriority: '● P2',
          queueEvidence: [],
        },
        {
          beadId: 'dadeto-abcd',
          beadTitle: 'Blocked bead',
          outcome: 'blocked',
          summary: 'Missing workflow guidance for the next step.',
        }
      )
    ).toMatchObject({
      state: 'blocked',
      currentBeadId: 'dadeto-abcd',
      currentBeadTitle: 'Blocked bead',
      currentBeadPriority: '● P2',
      latestEvidence:
        'Runner blocked dadeto-abcd: Missing workflow guidance for the next step.',
      operatorRecommendation:
        'Inspect the blocker, update the bead or workflow guidance, and only then launch another runner loop.',
      queueEvidence: ['dadeto-abcd: Missing workflow guidance for the next step.'],
      lastOutcome: {
        beadId: 'dadeto-abcd',
        beadTitle: 'Blocked bead',
        outcome: 'blocked',
        summary: 'Missing workflow guidance for the next step.',
      },
    });
  });
});
