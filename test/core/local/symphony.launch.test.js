import { applyRunnerLaunch } from '../../../src/core/local/symphony.js';

describe('core local symphony launch helpers', () => {
  test('applies a launched runner loop to scheduler-visible state', () => {
    expect(
      applyRunnerLaunch(
        {
          state: 'ready',
          currentBeadId: 'dadeto-u210',
          currentBeadTitle:
            'Launch one runner loop for the selected Symphony bead',
          currentBeadPriority: '● P2',
          queueEvidence: [
            'dadeto-u210 (● P2) Launch one runner loop for the selected Symphony bead',
          ],
        },
        {
          runId: '2026-03-08T19:15:00.000Z--dadeto-u210',
          startedAt: '2026-03-08T19:15:00.000Z',
          beadId: 'dadeto-u210',
          beadTitle: 'Launch one runner loop for the selected Symphony bead',
          beadPriority: '● P2',
          launchRequest: 'pop dadeto-u210',
        }
      )
    ).toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-u210',
      currentBeadTitle: 'Launch one runner loop for the selected Symphony bead',
      currentBeadPriority: '● P2',
      latestEvidence:
        'Runner launch 2026-03-08T19:15:00.000Z--dadeto-u210 started for dadeto-u210: pop dadeto-u210',
      operatorRecommendation:
        'Wait for the runner loop on dadeto-u210 to finish before launching another bead.',
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-u210',
        startedAt: '2026-03-08T19:15:00.000Z',
        beadId: 'dadeto-u210',
        beadTitle: 'Launch one runner loop for the selected Symphony bead',
        beadPriority: '● P2',
        launchRequest: 'pop dadeto-u210',
        state: 'running',
      },
      queueEvidence: [
        'dadeto-u210 (● P2) Launch one runner loop for the selected Symphony bead',
      ],
    });
  });
});
