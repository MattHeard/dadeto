import { jest } from '@jest/globals';
import {
  addModerationReport,
  initializeReportModerationFirebase,
  registerReportFunction,
  registerReportRoute,
  sendReportResponse,
  useReportMiddleware,
} from '../../src/cloud/report-for-moderation/effect-adapters.js';

const permission = Object.freeze({ allowed: true });

test('initializes Firebase behind the permission-first adapter', () => {
  const ensure = jest.fn();
  initializeReportModerationFirebase(permission, ensure);
  expect(ensure).toHaveBeenCalledTimes(1);
});

test('writes a moderation report through the permission-first adapter', async () => {
  const collection = { add: jest.fn().mockResolvedValue(undefined) };
  const report = { variant: 'one' };
  await addModerationReport(permission, collection, report);
  expect(collection.add).toHaveBeenCalledWith(report);
});

test('registers middleware and routes through permission-first adapters', () => {
  const app = { use: jest.fn(), all: jest.fn() };
  const middleware = {};
  const handler = jest.fn();
  useReportMiddleware(permission, app, middleware);
  registerReportRoute(permission, app, '/', handler);
  expect(app.use).toHaveBeenCalledWith(middleware);
  expect(app.all).toHaveBeenCalledWith('/', handler);
});

test('registers the cloud function and sends response bodies through adapters', () => {
  const onRequest = jest.fn(() => 'function');
  const functions = { region: jest.fn(() => ({ https: { onRequest } })) };
  const response = {
    status: jest.fn(() => response),
    send: jest.fn(),
    json: jest.fn(),
  };
  expect(registerReportFunction(permission, functions, {})).toBe('function');
  sendReportResponse(permission, response, 400, 'invalid');
  sendReportResponse(permission, response, 201, {});
  expect(onRequest).toHaveBeenCalledWith({});
  expect(response.status).toHaveBeenNthCalledWith(1, 400);
  expect(response.send).toHaveBeenCalledWith('invalid');
  expect(response.status).toHaveBeenNthCalledWith(2, 201);
  expect(response.json).toHaveBeenCalledWith({});
});
