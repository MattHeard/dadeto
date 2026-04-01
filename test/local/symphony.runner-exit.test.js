import { jest } from '@jest/globals';
import { createRunnerExitHandler } from '../../src/local/symphony/launch.js';

describe('Symphony runner exit handler', () => {
  const baseStatus = {
    state: 'running',
    startedAt: '2026-03-08T21:00:00.000Z',
    currentBeadId: 'dadeto-test',
    currentBeadTitle: 'Verify runner completion',
    currentBeadPriority: '● P2',
  };

  /**
   * Build a fresh status store stub for each exit scenario.
   * @returns {{ readStatus: jest.Mock, writeStatus: jest.Mock }} Status store stub.
   */
  function createStatusStore() {
    return {
      readStatus: jest.fn().mockResolvedValue({ ...baseStatus }),
      writeStatus: jest.fn().mockResolvedValue(undefined),
    };
  }

  test('marks the run completed when the exited process returned code 0', async () => {
    const statusStore = createStatusStore();
    const handler = createRunnerExitHandler({
      statusStore,
      runId: '2026-03-08T21:15:00.000Z--dadeto-test',
      beadId: 'dadeto-test',
      beadTitle: 'Verify runner completion',
    });

    await handler({ exitCode: 0, signal: null });

    expect(statusStore.readStatus).toHaveBeenCalled();
    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'idle',
        activeRun: null,
        lastOutcome: {
          beadId: 'dadeto-test',
          beadTitle: 'Verify runner completion',
          outcome: 'completed',
          summary:
            'Runner 2026-03-08T21:15:00.000Z--dadeto-test exited with code 0.',
        },
      })
    );
  });

  test('marks the run blocked when the process exits with a signal', async () => {
    const statusStore = createStatusStore();
    const handler = createRunnerExitHandler({
      statusStore,
      runId: '2026-03-08T21:30:00.000Z--dadeto-test',
      beadId: 'dadeto-test',
      beadTitle: 'Verify runner completion',
    });

    await handler({ exitCode: null, signal: 'SIGTERM' });

    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'blocked',
        activeRun: null,
        lastOutcome: {
          beadId: 'dadeto-test',
          beadTitle: 'Verify runner completion',
          outcome: 'blocked',
          summary:
            'Runner 2026-03-08T21:30:00.000Z--dadeto-test terminated with signal SIGTERM.',
        },
      })
    );
  });
});
