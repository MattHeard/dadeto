import { describe, expect, it, jest } from '@jest/globals';
import { runGetModerationVariant } from '../../../../src/core/cloud/get-moderation-variant/run.js';

describe('runGetModerationVariant', () => {
  it('sends object payloads as JSON and respects an already-sent middleware response', async () => {
    let routeHandler;
    let middlewareErrorHandler;
    const storyRef = {
      get: jest.fn().mockResolvedValue({ data: () => ({ title: 'Story' }) }),
    };
    const variantRef = {
      parent: { parent: { parent: { parent: storyRef } } },
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ content: 'Variant content', author: 'Author' }),
      }),
      collection: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      })),
    };
    const moderatorRead = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ variant: variantRef }),
    });
    const db = {
      collection: () => ({ doc: () => ({ get: moderatorRead }) }),
    };
    const app = Object.assign((req, res) => routeHandler(req, res), {
      use: jest.fn(handler => {
        if (typeof handler === 'function') middlewareErrorHandler = handler;
      }),
      get: jest.fn((_, handler) => {
        routeHandler = handler;
      }),
    });
    const response = {
      headersSent: false,
      status: jest.fn(() => response),
      send: jest.fn(),
      json: jest.fn(),
    };
    const sendHttpResponse = jest.fn((_, target, status, body) => {
      target.status(status).send(body);
    });
    const sendJsonResponse = jest.fn((_, target, status, body) => {
      target.status(status).json(body);
    });
    const logError = jest.fn();

    const runtime = runGetModerationVariant({
      createStartupBoundary: handler =>
        handler(Object.freeze({ scope: 'startup' })),
      createHttpBoundary: handler => (req, res) =>
        handler(Object.freeze({ scope: 'request' }), req, res),
      createInvocationBoundary:
        handler =>
        (...args) =>
          handler(Object.freeze({ scope: 'invocation' }), ...args),
      initializeApp: jest.fn(),
      initializeFirebaseApp: (_, initializer) => initializer(),
      createFirebaseAppManager: initializer => ({
        ensureFirebaseApp: initializer,
      }),
      getFirestoreInstance: () => db,
      getAuth: () => ({
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-1' }),
      }),
      express: () => app,
      cors: () => ({}),
      getEnvironmentVariables: () => ({ DENDRITE_ENVIRONMENT: 'dev' }),
      logDebug: jest.fn(),
      useMiddleware: (_, target, middleware) => target.use(middleware),
      registerGetRoute: (_, target, path, handler) => target.get(path, handler),
      sendHttpResponse,
      sendJsonResponse,
      logError,
      functions: {
        region: () => ({ https: { onRequest: handler => handler } }),
      },
    });

    await runtime.handle(
      { method: 'GET', get: () => 'Bearer token' },
      response
    );

    expect(sendJsonResponse).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'request' }),
      response,
      200,
      {
        title: 'Story',
        content: 'Variant content',
        author: 'Author',
        options: [],
      }
    );
    expect(sendHttpResponse).not.toHaveBeenCalled();

    response.headersSent = true;
    await middlewareErrorHandler(null, {}, response);
    expect(sendHttpResponse).not.toHaveBeenCalled();

    response.headersSent = false;
    await middlewareErrorHandler(null, {}, response);
    expect(sendHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'invocation' }),
      response,
      500,
      'get-moderation-variant middleware failed: null'
    );

    const queryError = new Error('moderator lookup failed');
    moderatorRead.mockRejectedValue(queryError);
    await runtime.handle(
      { method: 'GET', get: () => 'Bearer token' },
      response
    );
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'request' }),
      queryError
    );
    expect(sendHttpResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'request' }),
      response,
      500,
      'get-moderation-variant failed: moderator lookup failed'
    );
  });

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
      logDebug: jest.fn(),
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
