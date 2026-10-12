import { jest } from '@jest/globals';
import {
  forwardRealtimeError,
  registerRealtimeErrorHandler,
  registerRealtimeFunction,
  registerRealtimePostRoute,
  sendRealtimeAnswer,
  sendRealtimeError,
  useRealtimeMiddleware,
} from '../../../src/cloud/realtime-call/effect-adapters.js';

const permission = Object.freeze({ allowed: true });

test('registers middleware, routes, error handler, and HTTPS function', () => {
  const app = { use: jest.fn(), post: jest.fn() };
  const middleware = {};
  const route = jest.fn();
  const errorHandler = jest.fn();
  const onRequest = jest.fn(() => 'function');
  useRealtimeMiddleware(permission, app, middleware);
  registerRealtimePostRoute(permission, app, '/', route);
  registerRealtimeErrorHandler(permission, app, errorHandler);
  expect(registerRealtimeFunction(permission, onRequest, app)).toBe('function');
  expect(app.use).toHaveBeenNthCalledWith(1, middleware);
  expect(app.post).toHaveBeenCalledWith('/', route);
  const registeredErrorHandler = app.use.mock.calls[1][0];
  expect(registeredErrorHandler).toEqual(expect.any(Function));
  const failure = new Error('request failed');
  registeredErrorHandler(failure, {}, {}, jest.fn());
  const requestPermission = errorHandler.mock.calls[0][0];
  expect(requestPermission).not.toBe(permission);
  expect(Object.isFrozen(requestPermission)).toBe(true);
  expect(errorHandler).toHaveBeenCalledWith(requestPermission, failure, {}, {});
  expect(onRequest).toHaveBeenCalledWith({ region: 'europe-west1' }, app);
});

test('writes the SDP response and optional Location with explicit permission', () => {
  const response = {
    set: jest.fn(),
    type: jest.fn(() => response),
    send: jest.fn(),
  };
  sendRealtimeAnswer(permission, response, 'answer-sdp', '/calls/one');
  expect(response.set).toHaveBeenCalledWith('Location', '/calls/one');
  expect(response.type).toHaveBeenCalledWith('application/sdp');
  expect(response.send).toHaveBeenCalledWith('answer-sdp');

  response.set.mockClear();
  sendRealtimeAnswer(permission, response, 'answer-two', '');
  expect(response.set).not.toHaveBeenCalled();
});

test('forwards Express errors and sends normalized error responses', () => {
  const next = jest.fn();
  const error = new Error('failure');
  forwardRealtimeError(permission, next, error);
  expect(next).toHaveBeenCalledWith(error);

  const response = {
    status: jest.fn(() => response),
    json: jest.fn(),
  };
  sendRealtimeError(permission, response, error);
  sendRealtimeError(permission, response, 'unknown');
  expect(response.status).toHaveBeenNthCalledWith(1, 500);
  expect(response.json).toHaveBeenNthCalledWith(1, { error: 'failure' });
  expect(response.status).toHaveBeenNthCalledWith(2, 500);
  expect(response.json).toHaveBeenNthCalledWith(2, {
    error: 'Unknown server error',
  });
});
