import { describe, expect, it, jest } from '@jest/globals';
import { runGetModerationVariant } from '../../../../src/core/cloud/get-moderation-variant/run.js';

describe('runGetModerationVariant', () => {
  it('keeps startup effects out of request and middleware callbacks', async () => {
    const startupPermissions = [];
    const requestPermissions = [];
    const invocationPermissions = [];
    const createToken = scope => Object.freeze({ scope, id: Symbol(scope) });
    let routeHandler;
    const app = Object.assign((req, res) => routeHandler(req, res), {
      use: jest.fn(),
      get: jest.fn((_, handler) => {
        routeHandler = handler;
      }),
    });
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const response = {
      headersSent: false,
      status: jest.fn(() => response),
      send: jest.fn(),
      json: jest.fn(),
    };
    const useMiddleware = jest.fn((_, appInstance, middleware) =>
      appInstance.use(middleware)
    );
    const sendHttpResponse = jest.fn((_, target, status, body) => {
      target.status(status).send(body);
    });
    const logError = jest.fn();

    const runtime = runGetModerationVariant({
      createStartupBoundary(handler) {
        const permission = createToken('startup');
        startupPermissions.push(permission);
        return handler(permission);
      },
      createHttpBoundary(handler) {
        return (req, res) => {
          const permission = createToken('request');
          requestPermissions.push(permission);
          return handler(permission, req, res);
        };
      },
      createInvocationBoundary(handler) {
        return (...args) => {
          const permission = createToken('invocation');
          invocationPermissions.push(permission);
          return handler(permission, ...args);
        };
      },
      initializeApp: jest.fn(),
      initializeFirebaseApp: (permission, initializer) => {
        expect(permission).toBe(startupPermissions[0]);
        return initializer();
      },
      createFirebaseAppManager: initializer => ({
        ensureFirebaseApp: () => initializer(),
      }),
      getFirestoreInstance: options => {
        options.ensureAppFn();
        return db;
      },
      getAuth: () => auth,
      express: () => app,
      cors: jest.fn(() => ({ cors: true })),
      getEnvironmentVariables: () => ({ DENDRITE_ENVIRONMENT: 'dev' }),
      useMiddleware,
      registerGetRoute: jest.fn((_, appInstance, path, handler) =>
        appInstance.get(path, handler)
      ),
      sendHttpResponse,
      sendJsonResponse: jest.fn(),
      logError,
      functions: {
        region: () => ({ https: { onRequest: handler => handler } }),
      },
    });

    await runtime.handle({ method: 'GET' }, response);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith(
      'Missing or invalid Authorization header'
    );
    expect(requestPermissions[0]).not.toBe(startupPermissions[0]);

    const middlewareErrorHandler = useMiddleware.mock.calls[1][2];
    await middlewareErrorHandler(new Error('middleware failure'), {}, response);
    expect(invocationPermissions).toHaveLength(1);
    expect(invocationPermissions[0]).not.toBe(startupPermissions[0]);
    expect(sendHttpResponse).toHaveBeenLastCalledWith(
      invocationPermissions[0],
      response,
      500,
      'get-moderation-variant middleware failed: middleware failure'
    );
    expect(logError).toHaveBeenCalledWith(
      invocationPermissions[0],
      expect.any(Error)
    );
  });
});
