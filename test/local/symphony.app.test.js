import { jest } from '@jest/globals';
import { createSymphonyAppHandle } from '../../src/core/local/symphony/app.js';
import {
  createSymphonyApp,
  createSymphonyLaunchHandler,
  createSymphonyRefreshHandler,
  createSymphonyStatusHandler,
} from '../../src/local/symphony/app.js';

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
        activeRun: null,
        operatorTrustReason:
          'Symphony marked run 2026-03-08T22:38:07.435Z--dadeto-n3nd as blocked because pid 777777 was no longer alive when status was requested.',
        lastOutcome: expect.objectContaining({
          beadId: 'dadeto-n3nd',
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
      requested_at: '2026-03-11T04:00:00.000Z',
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
      const handler = coreHandle.createSymphonyStatusHandler({
        initialStatus: {
          state: 'ready',
        },
        statusStore: testCase.statusStore,
      });

      await handler({}, response, error => {
        throw error;
      });

      expect(response.jsonValue).toMatchObject({
        state: 'running',
      });
    }
  });

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
});
