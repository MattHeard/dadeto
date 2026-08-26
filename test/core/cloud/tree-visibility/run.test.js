import { jest } from '@jest/globals';
import { createTreeVisibilityRegenerationHandles } from '../../../../src/core/cloud/tree-visibility/run.js';

test('builds daily and HTTP regeneration entrypoints', async () => {
  const scheduledRun = jest.fn();
  const functions = {
    region: jest.fn(() => ({
      pubsub: {
        schedule: jest.fn(cron => ({ cron, onRun: fn => ({ fn }) })),
      },
      https: { onRequest: jest.fn(fn => ({ fn })) },
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
  });

  expect(handles.scheduled).toHaveProperty('fn');
  expect(handles.http).toHaveProperty('fn');
  expect(functions.region).toHaveBeenNthCalledWith(1, 'europe-west1');
  expect(functions.region).toHaveBeenNthCalledWith(2, 'europe-west1');
  const firstRegion = functions.region.mock.results[0].value;
  expect(firstRegion.pubsub.schedule).toHaveBeenCalledWith('every 24 hours');
  expect(
    functions.region.mock.results[1].value.https.onRequest
  ).toHaveBeenCalledWith(expect.any(Function));
  await handles.scheduled.fn();
  const response = { status: jest.fn() };
  response.status.mockReturnValue({ json: jest.fn() });
  await handles.http.fn({}, response);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
  expect(functions.region).toHaveBeenCalledTimes(2);
});
