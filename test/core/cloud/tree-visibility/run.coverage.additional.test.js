import { jest } from '@jest/globals';
import {
  createTreeVisibilityRegenerationHandlers,
  createTreeVisibilityRegenerationHandles,
} from '../../../../src/core/cloud/tree-visibility/run.js';

test('registers and executes scheduled and HTTP regeneration handlers', async () => {
  const scheduledRun = jest.fn();
  const httpRun = jest.fn();
  const functions = {
    region: jest.fn(() => ({
      pubsub: {
        schedule: jest.fn(() => ({
          onRun: handler => {
            scheduledRun.mockImplementation(handler);
            return 'scheduled';
          },
        })),
      },
      https: {
        onRequest: handler => {
          httpRun.mockImplementation(handler);
          return 'http';
        },
      },
    })),
  };
  const getFirestoreInstance = jest.fn(() => ({
    collectionGroup: jest.fn(() => ({
      where: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [] })) })),
    })),
  }));
  const render = jest.fn();
  const handlers = createTreeVisibilityRegenerationHandlers(
    getFirestoreInstance,
    render
  );
  const handles = createTreeVisibilityRegenerationHandles(
    Object.freeze({}),
    (_permission, handler) => {
      return functions
        .region('europe-west1')
        .pubsub.schedule('every 24 hours')
        .onRun(handler);
    },
    (_permission, handler) => {
      return functions.region('europe-west1').https.onRequest(handler);
    },
    handlers
  );

  expect(handles).toEqual({ scheduled: 'scheduled', http: 'http' });
  await expect(scheduledRun()).resolves.toBeNull();
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await httpRun({}, response);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({ processed: 0, failed: 0 });
  expect(functions.region).toHaveBeenCalledTimes(2);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
});
