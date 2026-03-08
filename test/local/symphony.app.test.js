import {
  createSymphonyLaunchHandler,
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
});
