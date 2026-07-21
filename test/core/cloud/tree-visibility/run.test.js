import { jest } from '@jest/globals';
import { createTreeVisibilityRegenerationHandles } from '../../../../src/core/cloud/tree-visibility/run.js';

test('builds daily and HTTP regeneration entrypoints', async () => {
  const scheduledRun = jest.fn();
  const httpRun = jest.fn();
  const functions = {
    region: jest.fn(() => ({
      pubsub: { schedule: jest.fn(() => ({ onRun: fn => ({ fn }) })) },
      https: { onRequest: fn => ({ fn }) },
    })),
  };
  const getFirestoreInstance = jest.fn(() => ({
    collectionGroup: () => ({
      where: () => ({
        get: async () => ({ docs: [] }),
      }),
    }),
  }));
  const handles = createTreeVisibilityRegenerationHandles({
    functions,
    getFirestoreInstance,
    render: scheduledRun,
    consoleError: httpRun,
  });

  expect(handles.scheduled).toHaveProperty('fn');
  expect(handles.http).toHaveProperty('fn');
  await handles.scheduled.fn();
  const response = { status: jest.fn() };
  response.status.mockReturnValue({ json: jest.fn() });
  await handles.http.fn({}, response);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
  expect(functions.region).toHaveBeenCalledTimes(2);
});
