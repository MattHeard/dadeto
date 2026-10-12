import { jest } from '@jest/globals';
import { createRealtimeCallRun } from '../../../../src/core/cloud/realtime-call/run.js';

test('composes registration with startup permission and binds request capabilities', async () => {
  const startupPermission = Object.freeze({ startup: true });
  const requestPermission = Object.freeze({ request: true });
  const app = {};
  const routeCalls = [];
  const middlewareCalls = [];
  const registerErrorHandler = jest.fn();
  const registerFunction = jest.fn(() => 'cloud-function');
  const exchangeRealtimeCallSdp = jest.fn(async body => ({
    sdpAnswer: `answer:${body}`,
    location: '/calls/1',
  }));
  const sendAnswer = jest.fn();
  const forwardError = jest.fn();
  const sendError = jest.fn();
  const express = Object.assign(
    jest.fn(() => app),
    {
      text: jest.fn(() => 'text-middleware'),
    }
  );
  const dependencies = {
    onRequest: jest.fn(),
    express,
    cors: jest.fn(() => 'cors-middleware'),
    allowedOrigins: ['https://allowed.test'],
    exchangeRealtimeCallSdp,
    bindRequestBoundary:
      handler =>
      (...args) =>
        handler(requestPermission, ...args),
    useMiddleware: jest.fn((permission, target, middleware) =>
      middlewareCalls.push([permission, target, middleware])
    ),
    registerPostRoute: jest.fn((permission, target, path, handler) =>
      routeCalls.push([permission, target, path, handler])
    ),
    registerErrorHandler,
    registerFunction,
    sendAnswer,
    forwardError,
    sendError,
  };

  const result = createRealtimeCallRun(startupPermission, dependencies);

  expect(middlewareCalls).toEqual([
    [startupPermission, app, 'cors-middleware'],
    [startupPermission, app, 'text-middleware'],
  ]);
  expect(routeCalls[0].slice(0, 3)).toEqual([startupPermission, app, '/']);
  expect(registerErrorHandler).toHaveBeenCalledWith(
    startupPermission,
    app,
    expect.any(Function)
  );
  expect(registerFunction).toHaveBeenCalledWith(
    startupPermission,
    dependencies.onRequest,
    app
  );
  expect(result).toEqual({ app, handle: 'cloud-function' });

  const response = {};
  const next = jest.fn();
  await routeCalls[0][3]({ body: 'offer' }, response, next);
  expect(exchangeRealtimeCallSdp).toHaveBeenCalledWith('offer');
  expect(sendAnswer).toHaveBeenCalledWith(
    requestPermission,
    response,
    'answer:offer',
    '/calls/1'
  );
  expect(forwardError).not.toHaveBeenCalled();

  const failure = new Error('OpenAI unavailable');
  exchangeRealtimeCallSdp.mockRejectedValueOnce(failure);
  await routeCalls[0][3]({ body: 12 }, response, next);
  expect(exchangeRealtimeCallSdp).toHaveBeenLastCalledWith('');
  expect(forwardError).toHaveBeenCalledWith(requestPermission, next, failure);

  const errorHandler = registerErrorHandler.mock.calls[0][2];
  errorHandler(requestPermission, failure, {}, response);
  expect(sendError).toHaveBeenCalledWith(requestPermission, response, failure);
});

test('rejects disallowed CORS origins through the configured callback', () => {
  const app = {};
  const cors = jest.fn(value => value);
  const permission = Object.freeze({ startup: true });
  createRealtimeCallRun(permission, {
    onRequest: jest.fn(),
    express: Object.assign(
      jest.fn(() => app),
      { text: jest.fn() }
    ),
    cors,
    allowedOrigins: ['https://allowed.test'],
    exchangeRealtimeCallSdp: jest.fn(),
    bindRequestBoundary: handler => handler,
    useMiddleware: jest.fn(),
    registerPostRoute: jest.fn(),
    registerErrorHandler: jest.fn(),
    registerFunction: jest.fn(),
    sendAnswer: jest.fn(),
    forwardError: jest.fn(),
    sendError: jest.fn(),
  });

  const callback = cors.mock.calls[0][0].origin;
  const rejected = jest.fn();
  const allowed = jest.fn();
  callback(undefined, allowed);
  expect(allowed).toHaveBeenCalledWith(null, true);
  callback('https://allowed.test', allowed);
  expect(allowed).toHaveBeenLastCalledWith(null, true);
  callback('https://denied.test', rejected);
  expect(rejected).toHaveBeenCalledWith(expect.any(Error));
});
