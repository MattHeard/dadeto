import { jest } from '@jest/globals';
import { runReportForModeration } from '../../../../src/core/cloud/report-for-moderation/run.js';
import { registerHttpEndpoint } from '../../../../src/cloud/http-endpoint-effect-adapter.js';

test('registers a report endpoint with explicit startup and request permissions', async () => {
  const startupPermission = Object.freeze({ startup: true });
  const requestPermission = Object.freeze({ request: true });
  const add = jest.fn().mockResolvedValue(undefined);
  const query = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true }),
  };
  const collection = { add, where: jest.fn(() => query) };
  const db = { collection: jest.fn(() => collection) };
  const app = { use: jest.fn(), all: jest.fn() };
  const onRequest = jest.fn(() => 'cloud-function');
  const functions = { region: jest.fn(() => ({ https: { onRequest } })) };
  const sendResponse = jest.fn();
  const handler = runReportForModeration(startupPermission, {
    functions,
    express: Object.assign(
      jest.fn(() => app),
      {
        json: jest.fn(() => 'json'),
      }
    ),
    cors: jest.fn(() => 'cors'),
    FieldValue: { serverTimestamp: jest.fn(() => 'timestamp') },
    db,
    registerHttpEndpoint,
    addModerationReport: async (permission, target, report) => {
      await add(permission, target, report);
    },
    sendResponse,
    createHttpBoundary: callback => (req, res) =>
      callback(requestPermission, req, res),
    getEnvironmentVariables: jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-test',
    })),
  });

  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(app.all).toHaveBeenCalledWith('/', expect.any(Function));
  expect(app.use).toHaveBeenCalledTimes(2);
  expect(handler.handle).toBe('cloud-function');

  const response = {
    method: 'POST',
    body: { variant: 'v', reporterIdentity: 'r' },
  };
  await handler.handleReportForModeration(requestPermission, response, {});
  expect(add).toHaveBeenCalledWith(requestPermission, collection, {
    variant: 'v',
    reporterIdentity: 'r',
    createdAt: 'timestamp',
  });
  expect(sendResponse).toHaveBeenCalledWith(requestPermission, {}, 201, {});
});
