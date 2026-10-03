import { jest } from '@jest/globals';
import { createSymphonyBootstrapHandle } from '../../../src/core/local/symphony/bootstrap.js';

/**
 * Create bootstrap dependencies for tests.
 * @param {object} overrides Dependency overrides.
 * @returns {object} Test dependencies plus written statuses.
 */
function createDeps(overrides = {}) {
  const writtenStatuses = [];
  return {
    writtenStatuses,
    createSymphonyStatusStore:
      overrides.createSymphonyStatusStore ??
      (() => ({
        writeStatus: async status => writtenStatuses.push(status),
        readStatus: async () => overrides.previousStatus ?? null,
      })),
    getSymphonyRuntimeVersion: () => 'test-version',
    loadSymphonyConfig: async () => ({
      configPath: '/repo/tracking/symphony.local.json',
      workspaceRoot: '/repo/.worktrees/symphony',
      logDir: '/repo/tracking/symphony',
      statusPath: '/repo/tracking/symphony/status.json',
      pollIntervalMs: 1000,
      maxConcurrentRuns: 1,
      defaultBranch: 'main',
      tracker: {
        readyCommand: 'bd ready --sort priority',
      },
      launcher: {
        kind: 'codex',
      },
    }),
    createBdTracker: () => ({
      pollReadyBeads: async () => ({
        command: 'bd ready --sort priority',
        readyBeads: [],
        queueSummary: [],
        selectedBead: null,
      }),
    }),
    loadSymphonyWorkflow:
      overrides.loadSymphonyWorkflow ??
      (async () => ({
        exists: false,
      })),
    cwd: () => '/repo',
    ...overrides,
  };
}

describe('core Symphony bootstrap handle', () => {
  test('optional store reads preserve getter count, receiver and rejection identity', async () => {
    const store = { writeStatus: jest.fn() };
    const rejection = { source: 'status store' };
    const read = jest.fn(function () {
      expect(this).toBe(store);
      return Promise.reject(rejection);
    });
    const getter = jest.fn(() => read);
    Object.defineProperty(store, 'readStatus', { get: getter });
    const handle = createSymphonyBootstrapHandle(createDeps());
    await expect(
      handle.refreshSymphonyStatus({ statusStore: store })
    ).rejects.toBe(rejection);
    expect(getter).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(1);
    expect(store.writeStatus).not.toHaveBeenCalled();
  });

  test('uses a custom status store factory while bootstrapping', async () => {
    const store = {
      writeStatus: jest.fn().mockResolvedValue(undefined),
    };
    const deps = createDeps();
    const handle = createSymphonyBootstrapHandle(deps);

    const result = await handle.bootstrapSymphony({
      statusStoreFactory: () => store,
      now: () => new Date('2026-03-14T10:00:00.000Z'),
    });

    expect(result.statusStore).toBe(store);
    expect(store.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'blocked',
        startedAt: '2026-03-14T10:00:00.000Z',
      })
    );
  });

  test('bootstraps with default options', async () => {
    const deps = createDeps();
    const handle = createSymphonyBootstrapHandle(deps);

    const result = await handle.bootstrapSymphony();

    expect(result.status.repoRoot).toBe('/repo');
    expect(result.status.runtime).toEqual({ version: 'test-version' });
  });

  test('refresh rejects a missing writable status store', async () => {
    const deps = createDeps();
    const handle = createSymphonyBootstrapHandle(deps);

    await expect(handle.refreshSymphonyStatus()).rejects.toThrow(
      'Symphony refresh requires a writable status store.'
    );
  });

  test('refresh handles stores without read support and preserves failed launches', async () => {
    const previousStatus = {
      state: 'idle',
      eventLog: ['older event'],
      lastLaunchAttempt: {
        outcome: 'failed',
        summary: 'Codex launch failed.',
      },
    };
    const statusStore = {
      writeStatus: jest.fn().mockResolvedValue(undefined),
    };
    const deps = createDeps({
      createBdTracker: () => ({
        pollReadyBeads: async () => ({
          command: 'bd ready --sort priority',
          readyBeads: [
            {
              id: 'dadeto-ready',
              title: 'Ready bead',
              priority: '● P1',
            },
          ],
          queueSummary: ['dadeto-ready (● P1) Ready bead'],
          selectedBead: {
            id: 'dadeto-ready',
            title: 'Ready bead',
            priority: '● P1',
          },
        }),
      }),
      loadSymphonyWorkflow: async () => ({
        exists: true,
      }),
    });
    const handle = createSymphonyBootstrapHandle(deps);

    const snapshot = await handle.refreshSymphonyStatus({
      statusStore: {
        ...statusStore,
        readStatus: async () => previousStatus,
      },
      now: () => new Date('2026-03-14T11:00:00.000Z'),
    });
    const noReadSnapshot = await handle.refreshSymphonyStatus({
      statusStore,
      now: () => new Date('2026-03-14T12:00:00.000Z'),
    });

    expect(snapshot.status.eventLog).toEqual(['older event']);
    expect(snapshot.status.lastLaunchAttempt).toEqual({
      outcome: 'failed',
      summary: 'Codex launch failed.',
    });
    expect(noReadSnapshot.status.eventLog).toEqual([]);
    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'ready',
        currentBeadId: 'dadeto-ready',
      })
    );
  });

  test('refresh ignores non-array previous event logs', async () => {
    const deps = createDeps({
      previousStatus: {
        eventLog: 'not an array',
      },
    });
    const handle = createSymphonyBootstrapHandle(deps);
    const snapshot = await handle.refreshSymphonyStatus({
      statusStore: {
        readStatus: async () => ({
          eventLog: 'not an array',
        }),
        writeStatus: jest.fn(),
      },
    });

    expect(snapshot.status.eventLog).toEqual([]);
  });

  test('does not preserve a non-failed launch attempt', async () => {
    const handle = createSymphonyBootstrapHandle(createDeps());
    const snapshot = await handle.refreshSymphonyStatus({
      statusStore: {
        readStatus: async () => ({
          lastLaunchAttempt: { outcome: 'succeeded', summary: 'done' },
        }),
        writeStatus: jest.fn(),
      },
    });

    expect(snapshot.status.lastLaunchAttempt).toBeUndefined();
  });

  test('preserves running status with fallback fields', async () => {
    const deps = createDeps({
      createBdTracker: () => ({
        pollReadyBeads: async () => ({
          command: 'bd ready --sort priority',
          readyBeads: [
            {
              id: 'dadeto-running',
              title: 'Running bead',
              priority: '● P1',
            },
          ],
          queueSummary: ['dadeto-running (● P1) Running bead'],
          selectedBead: {
            id: 'dadeto-running',
            title: 'Running bead',
            priority: '● P1',
          },
        }),
      }),
      loadSymphonyWorkflow: async () => ({
        exists: true,
      }),
    });
    const handle = createSymphonyBootstrapHandle(deps);
    const snapshot = await handle.refreshSymphonyStatus({
      statusStore: {
        readStatus: async () => ({
          state: 'running',
          currentBeadId: 'dadeto-running',
          activeRun: {},
        }),
        writeStatus: jest.fn(),
      },
    });

    expect(snapshot.status).toEqual(
      expect.objectContaining({
        state: 'running',
        currentBeadId: 'dadeto-running',
        currentBeadTitle: 'Running bead',
        currentBeadPriority: '● P1',
        activeRun: {},
      })
    );
    expect(snapshot.status.lastLaunchAttempt).toBeUndefined();
    expect(snapshot.status.lastOutcome).toBeUndefined();
  });

  test.each([
    ['Previous evidence', 'Previous evidence'],
    ['', undefined],
  ])(
    'preserves running optional fields with lazy reads (%p, %p)',
    async (first, second) => {
      const deps = createDeps({
        createBdTracker: () => ({
          pollReadyBeads: async () => ({
            command: 'bd ready --sort priority',
            readyBeads: [
              {
                id: 'dadeto-running',
                title: 'Running bead',
                priority: '● P1',
              },
            ],
            queueSummary: ['dadeto-running (● P1) Running bead'],
            selectedBead: {
              id: 'dadeto-running',
              title: 'Running bead',
              priority: '● P1',
            },
          }),
        }),
        loadSymphonyWorkflow: async () => ({
          exists: true,
        }),
      });
      const handle = createSymphonyBootstrapHandle(deps);
      const previousStatus = {
        startedAt: '2026-03-14T09:00:00.000Z',
        state: 'running',
        currentBeadId: 'dadeto-running',
        currentBeadTitle: 'Previous title',
        currentBeadPriority: '● P0',
        latestEvidence: 'Previous evidence',
        operatorRecommendation: 'Previous recommendation',
        activeRun: {
          runId: 'runner-optional',
        },
        lastLaunchAttempt: {
          outcome: 'failed',
        },
        lastOutcome: {
          outcome: 'blocked',
        },
      };
      const evidence = jest
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const outcome = { outcome: 'blocked', detail: { source: 'previous' } };
      const readOutcome = jest.fn(() => outcome);
      const readBeadId = jest.fn(() => 'dadeto-running');
      Object.defineProperty(previousStatus, 'currentBeadId', {
        get: readBeadId,
      });
      Object.defineProperty(previousStatus, 'latestEvidence', {
        get: evidence,
      });
      Object.defineProperty(previousStatus, 'lastOutcome', {
        get: readOutcome,
      });
      const snapshot = await handle.refreshSymphonyStatus({
        statusStore: {
          readStatus: async () => previousStatus,
          writeStatus: jest.fn(),
        },
      });

      expect(snapshot.status).toEqual(
        expect.objectContaining({
          startedAt: '2026-03-14T09:00:00.000Z',
          currentBeadTitle: 'Previous title',
          currentBeadPriority: '● P0',
          latestEvidence: second,
          operatorRecommendation: 'Previous recommendation',
          lastLaunchAttempt: { outcome: 'failed' },
          lastOutcome: outcome,
        })
      );
      expect(evidence).toHaveBeenCalledTimes(2);
      expect(readOutcome).toHaveBeenCalledTimes(3);
      expect(readBeadId).toHaveBeenCalledTimes(4);
      expect(snapshot.status.lastOutcome).not.toBe(outcome);
      expect(snapshot.status.lastOutcome.detail).toBe(outcome.detail);
    }
  );
});
