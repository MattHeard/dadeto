import { jest } from '@jest/globals';

await jest.unstable_mockModule(
  '../../src/local/symphony/runtimeVersion.js',
  () => ({
    getSymphonyRuntimeVersion: jest.fn(() => 'test-runtime'),
  })
);

const { createSymphonyAppHandle } = await import(
  '../../src/core/local/symphony/app.js'
);

const requestedAtKey = 'requested_at';
const {
  createSymphonyApp,
  createSymphonyLaunchHandler,
  createSymphonyRefreshHandler,
  createSymphonyStatusHandler,
} = await import('../../src/local/symphony/app.js');
const { getActiveRunBeadId, getOrphanedRunId, hasReconciliableActiveRun } =
  await import('../../src/core/local/symphony/app.js');

/**
 * @returns {{
 *   statusCode: number,
 *   jsonValue: unknown,
 *   status: (code: number) => unknown,
 *   json: (value: unknown) => unknown
 * }} Response test double for Symphony app handlers.
 */
function createResponseDouble() {
  return {
    statusCode: 200,
    jsonValue: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.jsonValue = value;
      return this;
    },
  };
}

describe('local symphony app handlers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  test('serves operator recommendation from the status handler', async () => {
    const handler = createSymphonyStatusHandler({
      initialStatus: {
        state: 'ready',
        operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
      },
      statusStore: {
        async readStatus() {
          return {
            state: 'ready',
            operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
          };
        },
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(200);
    expect(response.jsonValue).toEqual({
      state: 'ready',
      operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
    });
  });

  test('serves initial status when the store is empty', async () => {
    const handler = createSymphonyStatusHandler({
      initialStatus: {
        state: 'idle',
      },
      statusStore: {
        async readStatus() {
          return null;
        },
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.jsonValue).toEqual({
      state: 'idle',
    });
  });

  test('prefers a stored status over the initial status', async () => {
    const handler = createSymphonyStatusHandler({
      initialStatus: { state: 'initial', marker: 'initial-only' },
      statusStore: {
        async readStatus() {
          return { state: 'stored', marker: 'stored-only' };
        },
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.jsonValue).toEqual({
      state: 'stored',
      marker: 'stored-only',
    });
  });

  test('reconciles active run when the pid no longer exists', async () => {
    const response = createResponseDouble();
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        currentBeadId: 'dadeto-xyz',
        currentBeadTitle:
          'Reconcile finished Ralph runs back into Symphony status',
        activeRun: {
          runId: '2026-03-08T22:38:07.435Z--dadeto-n3nd',
          beadId: 'dadeto-n3nd',
          beadTitle: 'Reconcile finished Ralph runs back into Symphony status',
          pid: 777777,
          stdoutPath: '/tmp/run.stdout',
          stderrPath: '/tmp/run.stderr',
        },
      }),
      writeStatus: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(process, 'kill').mockImplementation(() => {
      const error = new Error('not found');
      error.code = 'ESRCH';
      throw error;
    });

    const handler = createSymphonyStatusHandler({
      initialStatus: {
        state: 'ready',
      },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'blocked',
        lastOutcome: expect.objectContaining({
          beadTitle: 'Reconcile finished Ralph runs back into Symphony status',
        }),
        activeRun: null,
        operatorTrustReason:
          'Symphony marked run 2026-03-08T22:38:07.435Z--dadeto-n3nd as blocked because pid 777777 was no longer alive when status was requested.',
        lastOutcome: expect.objectContaining({
          beadId: 'dadeto-n3nd',
          beadTitle: 'Reconcile finished Ralph runs back into Symphony status',
          outcome: 'blocked',
          summary: expect.stringContaining(
            'Runner 2026-03-08T22:38:07.435Z--dadeto-n3nd (pid 777777) is not running'
          ),
        }),
      })
    );
    expect(response.jsonValue).toEqual(
      expect.objectContaining({
        state: 'blocked',
        activeRun: null,
        operatorTrustReason:
          'Symphony marked run 2026-03-08T22:38:07.435Z--dadeto-n3nd as blocked because pid 777777 was no longer alive when status was requested.',
      })
    );
  });

  test('does not reconcile active run when the pid is still alive', async () => {
    const response = createResponseDouble();
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        currentBeadId: 'dadeto-alive',
        activeRun: {
          beadId: 'dadeto-alive',
          pid: 888888,
        },
      }),
      writeStatus: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(process, 'kill').mockImplementation(() => undefined);

    const handler = createSymphonyStatusHandler({
      initialStatus: {
        state: 'ready',
      },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(statusStore.writeStatus).not.toHaveBeenCalled();
    expect(response.jsonValue).toEqual(
      expect.objectContaining({
        state: 'running',
        activeRun: expect.objectContaining({
          beadId: 'dadeto-alive',
        }),
      })
    );
  });
});

describe('local symphony app launch handlers', () => {
  test('starts one Symphony Ralph launch from the operator trigger handler', async () => {
    const launchCalls = [];
    const handler = createSymphonyLaunchHandler({
      initialStatus: {
        state: 'ready',
        currentBeadId: 'dadeto-cc6z',
      },
      launchSelectedRunnerLoop: async options => {
        launchCalls.push(options);
        return {
          state: 'running',
          currentBeadId: 'dadeto-cc6z',
          activeRun: {
            runId: '2026-03-08T20:00:00.000Z--dadeto-cc6z',
          },
        };
      },
      repoRoot: '/tmp/dadeto',
      statusStore: {
        async readStatus() {
          return {
            state: 'ready',
            currentBeadId: 'dadeto-cc6z',
            marker: 'stored',
          };
        },
        async writeStatus() {},
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(202);
    expect(response.jsonValue).toEqual({
      state: 'running',
      currentBeadId: 'dadeto-cc6z',
      activeRun: {
        runId: '2026-03-08T20:00:00.000Z--dadeto-cc6z',
      },
    });
    expect(launchCalls).toEqual([
      {
        repoRoot: '/tmp/dadeto',
        status: {
          state: 'ready',
          currentBeadId: 'dadeto-cc6z',
          marker: 'stored',
        },
        statusStore: expect.objectContaining({
          readStatus: expect.any(Function),
          writeStatus: expect.any(Function),
        }),
      },
    ]);
  });

  test('reports missing launch configuration from the operator trigger handler', async () => {
    const handler = createSymphonyLaunchHandler({
      initialStatus: {
        state: 'ready',
        currentBeadId: 'dadeto-cc6z',
      },
      statusStore: {
        async readStatus() {
          return {
            state: 'ready',
            currentBeadId: 'dadeto-cc6z',
          };
        },
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(501);
    expect(response.jsonValue).toEqual({
      error: 'Symphony launch trigger is not configured.',
    });
  });

  test('reports a missing writable store even when a launcher is provided', async () => {
    const handler = createSymphonyLaunchHandler({
      initialStatus: { state: 'ready' },
      launchSelectedRunnerLoop: jest.fn(),
      statusStore: {
        async readStatus() {
          return null;
        },
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(501);
    expect(response.jsonValue).toEqual({
      error: 'Symphony launch trigger is not configured.',
    });
  });

  test('launch handler forwards launch errors to next', async () => {
    const error = new Error('launch failed');
    const handler = createSymphonyLaunchHandler({
      initialStatus: {
        state: 'ready',
      },
      launchSelectedRunnerLoop: async () => {
        throw error;
      },
      statusStore: {
        async readStatus() {
          return null;
        },
        async writeStatus() {},
      },
    });
    const next = jest.fn();

    await handler({}, createResponseDouble(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('local symphony app refresh handlers', () => {
  test('refresh handler persists a queued refresh response', async () => {
    const refreshSymphonyStatus = jest.fn().mockResolvedValue({
      status: {
        startedAt: '2026-03-11T04:00:00.000Z',
      },
    });
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus,
      isProcessAlive: () => true,
    });
    const handler = coreHandle.createSymphonyRefreshHandler({
      repoRoot: '/tmp/dadeto',
      now: () => new Date('2026-03-11T04:00:00.000Z'),
      configLoader: jest.fn(),
      workflowLoader: jest.fn(),
      trackerFactory: jest.fn(),
      statusStore: {
        writeStatus: jest.fn(),
      },
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(202);
    expect(response.jsonValue).toEqual({
      queued: true,
      coalesced: false,
      [requestedAtKey]: '2026-03-11T04:00:00.000Z',
      operations: ['poll', 'reconcile'],
    });
    expect(refreshSymphonyStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/tmp/dadeto',
        statusStore: expect.objectContaining({
          writeStatus: expect.any(Function),
        }),
      })
    );
  });

  test('refresh handler reports missing writable status store', async () => {
    const handler = createSymphonyRefreshHandler({
      statusStore: {},
    });
    const response = createResponseDouble();

    await handler({}, response, error => {
      throw error;
    });

    expect(response.statusCode).toBe(501);
    expect(response.jsonValue).toEqual({
      error: 'Symphony refresh trigger is not configured.',
    });
  });

  test('refresh handler forwards refresh errors to next', async () => {
    const error = new Error('refresh failed');
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: async () => {
        throw error;
      },
      isProcessAlive: () => true,
    });
    const handler = coreHandle.createSymphonyRefreshHandler({
      statusStore: {
        async writeStatus() {},
      },
    });
    const next = jest.fn();

    await handler({}, createResponseDouble(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('local symphony app factory', () => {
  test('app factory wires routes and error middleware', async () => {
    const routes = [];
    const middleware = [];
    const app = createSymphonyApp({
      initialStatus: {
        state: 'ready',
      },
      statusStore: {
        async readStatus() {
          return null;
        },
        async writeStatus() {},
      },
    });

    expect(app).toBeDefined();

    const expressDouble = () => ({
      get: (path, handler) => routes.push(['get', path, handler]),
      post: (path, handler) => routes.push(['post', path, handler]),
      use: handler => middleware.push(handler),
    });
    const coreHandle = createSymphonyAppHandle({
      express: expressDouble,
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => true,
    });
    const wiredApp = coreHandle.createSymphonyApp({
      initialStatus: { state: 'ready' },
      statusStore: {
        async readStatus() {
          return null;
        },
      },
    });
    const response = createResponseDouble();

    middleware[0](new Error('boom'), {}, response, () => {});

    expect(wiredApp).toBeDefined();
    expect(routes.map(([method, path]) => `${method} ${path}`)).toEqual([
      'get /api/symphony/status',
      'get /',
      'post /api/symphony/launch',
      'post /api/v1/refresh',
    ]);
    expect(response.statusCode).toBe(500);
    expect(response.jsonValue).toEqual({ error: 'boom' });

    const fallbackResponse = createResponseDouble();
    middleware[0]('plain failure', {}, fallbackResponse, () => {});
    expect(fallbackResponse.jsonValue).toEqual({
      error: 'Unknown server error',
    });
  });
});

describe('local symphony app status edge cases', () => {
  test('recognizes only object statuses with object active runs', () => {
    expect(hasReconciliableActiveRun(null)).toBe(false);
    expect(hasReconciliableActiveRun(undefined)).toBe(false);
    expect(hasReconciliableActiveRun({ activeRun: 'invalid' })).toBe(false);
    expect(hasReconciliableActiveRun({ activeRun: {} })).toBe(true);
  });

  test('rejects empty current bead ids and falls back to null', () => {
    expect(getActiveRunBeadId({ activeRun: {}, currentBeadId: '' })).toBeNull();
  });

  test('falls back from an empty run id directly', () => {
    expect(getOrphanedRunId({ runId: '', beadId: 'dadeto-bead' })).toBe(
      'dadeto-bead'
    );
    expect(getOrphanedRunId({ runId: 123, beadId: 'dadeto-bead' })).toBe(
      'dadeto-bead'
    );
  });

  test('status handler forwards reader errors to next', async () => {
    const error = new Error('read failed');
    const handler = createSymphonyStatusHandler({
      initialStatus: {
        state: 'ready',
      },
      statusStore: {
        async readStatus() {
          throw error;
        },
      },
    });
    const response = createResponseDouble();
    const next = jest.fn();

    await handler({}, response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('status handler leaves unreconcilable active runs alone', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const cases = [
      {
        statusStore: {
          async readStatus() {
            return {
              state: 'running',
              activeRun: {
                beadId: 'dadeto-nowrite',
                pid: 123,
              },
            };
          },
        },
      },
      {
        statusStore: {
          async readStatus() {
            return null;
          },
          writeStatus: jest.fn(),
        },
        initialStatus: null,
      },
      {
        statusStore: {
          async readStatus() {
            return {
              state: 'running',
              activeRun: null,
            };
          },
          writeStatus: jest.fn(),
        },
      },
      {
        statusStore: {
          async readStatus() {
            return {
              state: 'running',
              currentBeadId: 'dadeto-nopid',
              activeRun: {
                beadId: 'dadeto-nopid',
              },
            };
          },
          writeStatus: jest.fn(),
        },
      },
      {
        statusStore: {
          async readStatus() {
            return {
              state: 'running',
              activeRun: {
                pid: 456,
              },
            };
          },
          writeStatus: jest.fn(),
        },
      },
      {
        statusStore: {
          async readStatus() {
            return {
              state: 'running',
              activeRun: 'not an object',
            };
          },
          writeStatus: jest.fn(),
        },
      },
    ];

    for (const testCase of cases) {
      const response = createResponseDouble();
      const initialStatus =
        testCase.initialStatus === null ? null : { state: 'ready' };
      const handler = coreHandle.createSymphonyStatusHandler({
        initialStatus,
        statusStore: testCase.statusStore,
      });

      await handler({}, response, error => {
        throw error;
      });

      if (testCase.initialStatus === null) {
        expect(response.jsonValue).toBeNull();
      } else {
        expect(response.jsonValue).toMatchObject({
          state: 'running',
        });
      }
    }
  });
});

describe('local symphony app orphan details', () => {
  test('status handler reconciles with current bead id and no log paths', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      async readStatus() {
        return {
          state: 'running',
          currentBeadId: 'dadeto-current',
          activeRun: {
            pid: 789,
          },
        };
      },
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: {
        state: 'ready',
      },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'blocked',
        lastOutcome: expect.objectContaining({
          beadId: 'dadeto-current',
          summary:
            'Runner unknown (pid 789) is not running when Symphony status was requested; the exit event may have been missed while the server was offline.',
        }),
      })
    );
  });

  test('includes both non-empty log paths in an orphan summary', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        currentBeadId: 'dadeto-logs',
        activeRun: {
          pid: 654,
          stdoutPath: ' /tmp/stdout.log ',
          stderrPath: '/tmp/stderr.log',
        },
      }),
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: { state: 'ready' },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(response.jsonValue).toEqual(
      expect.objectContaining({
        lastOutcome: expect.objectContaining({
          summary:
            'Runner unknown (pid 654) is not running when Symphony status was requested; the exit event may have been missed while the server was offline. Logs:  /tmp/stdout.log , /tmp/stderr.log.',
        }),
      })
    );
  });

  test('uses the active bead id when an orphaned run has no run id or title', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        activeRun: {
          beadId: 'dadeto-fallback',
          beadTitle: 789,
          pid: 321,
        },
      }),
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: { state: 'ready' },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(statusStore.writeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        lastOutcome: expect.objectContaining({
          beadId: 'dadeto-fallback',
          beadTitle: null,
        }),
      })
    );
  });

  test('rejects non-string bead titles and current bead ids', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        currentBeadId: 123,
        activeRun: { pid: 456, beadTitle: 789 },
      }),
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: { state: 'ready' },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(statusStore.writeStatus).not.toHaveBeenCalled();
    expect(response.jsonValue).toEqual({
      state: 'running',
      currentBeadId: 123,
      activeRun: { pid: 456, beadTitle: 789 },
    });
  });

  test('falls back from an empty run id to the bead id', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        activeRun: { runId: '', beadId: 'dadeto-bead', pid: 123 },
      }),
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: { state: 'ready' },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(response.jsonValue).toEqual(
      expect.objectContaining({
        operatorTrustReason: expect.stringContaining('dadeto-bead'),
      })
    );
  });

  test('ignores blank and non-string log paths', async () => {
    const coreHandle = createSymphonyAppHandle({
      express: jest.fn(),
      refreshSymphonyStatus: jest.fn(),
      isProcessAlive: () => false,
    });
    const statusStore = {
      readStatus: jest.fn().mockResolvedValue({
        state: 'running',
        currentBeadId: 'dadeto-paths',
        activeRun: { pid: 321, stdoutPath: '   ', stderrPath: 456 },
      }),
      writeStatus: jest.fn(),
    };
    const response = createResponseDouble();
    const handler = coreHandle.createSymphonyStatusHandler({
      initialStatus: { state: 'ready' },
      statusStore,
    });

    await handler({}, response, error => {
      throw error;
    });

    expect(response.jsonValue.lastOutcome.summary).not.toContain('Logs:');
  });
});
