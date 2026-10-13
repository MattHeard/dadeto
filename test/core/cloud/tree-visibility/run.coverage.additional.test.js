import { jest } from '@jest/globals';
import {
  createTreeVisibilityRegenerationRunner,
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
  const permissions = [];
  const bindEffectBoundary = handler => {
    const permission = Object.freeze({ invocation: permissions.length });
    permissions.push(permission);
    return handler(permission);
  };
  const sendResponse = jest.fn((permission, response, body) =>
    response.status(200).json(body)
  );
  const run = createTreeVisibilityRegenerationRunner(
    getFirestoreInstance,
    render,
    jest.fn()
  );
  const handlers = createTreeVisibilityRegenerationHandlers(
    bindEffectBoundary,
    run,
    sendResponse
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
  expect(sendResponse).toHaveBeenCalledWith(permissions[1], response, {
    processed: 0,
    failed: 0,
  });
  expect(permissions[0]).not.toBe(permissions[1]);
  expect(functions.region).toHaveBeenCalledTimes(2);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
});
