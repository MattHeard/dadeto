import { jest } from '@jest/globals';
import { runMarkVariantDirty } from '../../../../src/core/cloud/mark-variant-dirty/run.js';

/**
 * Exercise endpoint response paths and verify every write is permission-gated.
 * @param {(req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<void>} handleRequest Wired endpoint handler.
 * @param {import('../../../../types/native-http').NativeHttpResponse} res Express response fake.
 * @param {{get: {mockRejectedValueOnce: (error: Error) => unknown}, verifyIdToken: {mockResolvedValueOnce: (value: object) => unknown, mockRejectedValueOnce: (error: Error) => unknown}, sendResponse: {mock: {calls: unknown[][]}}, logWarning: {mock: {calls: unknown[][]}}}} runtime Test adapters.
 * @returns {Promise<void>} Resolves after all response paths are checked.
 */
async function verifyResponseBranches(handleRequest, res, runtime) {
  await handleRequest({ method: 'GET' }, res);
  await handleRequest(
    {
      method: 'POST',
      get: jest.fn(() => 'malformed'),
      body: { page: 1, variant: 'a' },
    },
    res
  );
  await handleRequest(
    { method: 'POST', get: jest.fn(() => ''), body: { page: 1, variant: 'a' } },
    res
  );
  runtime.verifyIdToken.mockResolvedValueOnce({ uid: 'not-admin' });
  await handleRequest(
    {
      method: 'POST',
      get: jest.fn(() => 'Bearer token'),
      body: { page: 1, variant: 'a' },
    },
    res
  );
  runtime.verifyIdToken.mockRejectedValueOnce(new Error('token invalid'));
  await handleRequest(
    {
      method: 'POST',
      get: jest.fn(() => 'Bearer token'),
      body: { page: 1, variant: 'a' },
    },
    res
  );
  await handleRequest(
    {
      method: 'POST',
      get: jest.fn(() => 'Bearer token'),
      body: { page: 'invalid', variant: 'a' },
    },
    res
  );
  runtime.get.mockRejectedValueOnce(new Error('lookup failed'));
  await handleRequest(
    {
      method: 'POST',
      get: jest.fn(() => 'Bearer token'),
      body: { page: 12, variant: 'alpha' },
    },
    res
  );
  expect(
    runtime.sendResponse.mock.calls.map(([permission]) => permission)
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ scope: 'invocation' })])
  );
  expect(
    runtime.sendResponse.mock.calls.every(([permission]) =>
      Object.isFrozen(permission)
    )
  ).toBe(true);
  expect(runtime.sendResponse.mock.calls.map(([, , status]) => status)).toEqual(
    expect.arrayContaining([200, 400, 401, 403, 404, 405, 500])
  );
  expect(runtime.logWarning.mock.calls.map(([, message]) => message)).toEqual(
    expect.arrayContaining([
      'Admin auth rejected: malformed Authorization header',
      'Admin auth rejected: missing token',
      'Admin auth rejected: token verification failed',
    ])
  );
  expect(
    runtime.logWarning.mock.calls.every(([permission]) =>
      Object.isFrozen(permission)
    )
  ).toBe(true);
  expect(
    new Set(runtime.logWarning.mock.calls.map(([permission]) => permission))
      .size
  ).toBe(runtime.logWarning.mock.calls.length);
}

describe('runMarkVariantDirty', () => {
  test('wires the endpoint and returns exports', () => {
    const startupPermissions = [];
    const ensureFirebaseApp = jest.fn((permission, initializer) =>
      initializer(permission)
    );
    const createFirebaseAppManager = jest.fn(initializer => ({
      ensureFirebaseApp: permission =>
        ensureFirebaseApp(permission, initializer),
    }));
    const initializeApp = jest.fn();
    const initializeFirebaseApp = jest.fn((_, initializer) => initializer());
    const updateDocument = jest.fn().mockResolvedValue(undefined);
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1' });
    const getAuth = jest.fn(() => ({ verifyIdToken }));
    const db = {};
    const getFirestoreInstance = jest.fn(() => db);
    const expressApp = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => expressApp);
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const functions = {
      region: jest.fn(() => ({
        https: {
          onRequest: jest.fn(app => ({ app })),
        },
      })),
    };
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-123',
      PLAYWRIGHT_ORIGIN: 'https://preview.local',
    }));

    const result = runMarkVariantDirty({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getAuth,
      express,
      cors,
      functions,
      getEnvironmentVariables,
      bindStartupEffectBoundary: handler => {
        const permission = Object.freeze({
          startup: startupPermissions.length,
        });
        startupPermissions.push(permission);
        return handler(permission);
      },
      initializeFirebaseApp,
      bindEffectInvocationBoundary: handler => handler,
      updateDocument,
      sendResponse: jest.fn(),
      useMiddleware: (permission, app, middleware) => {
        expect(Object.isFrozen(permission)).toBe(true);
        app.use(middleware);
      },
      registerPostRoute: (permission, app, path, handler) => {
        expect(Object.isFrozen(permission)).toBe(true);
        app.post(path, handler);
      },
      logDebug: jest.fn(),
      logWarning: jest.fn(),
      ADMIN_UID: 'admin-uid',
    });

    expect(createFirebaseAppManager).toHaveBeenCalledWith(expect.any(Function));
    expect(ensureFirebaseApp).toHaveBeenCalledWith(
      startupPermissions[0],
      expect.any(Function)
    );
    expect(initializeFirebaseApp).toHaveBeenCalledWith(
      startupPermissions[0],
      initializeApp
    );
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(getFirestoreInstance).toHaveBeenCalledWith(startupPermissions[0], {
      ensureAppFn: expect.any(Function),
      environment: {
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://preview.local',
      },
    });
    getFirestoreInstance.mock.calls[0][1].ensureAppFn(startupPermissions[0]);
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(expressApp.use).toHaveBeenCalledWith('cors-middleware');
    expect(expressApp.use).toHaveBeenCalledWith('json-middleware');
    expect(expressApp.post).toHaveBeenCalledWith('/', expect.any(Function));
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(result).toEqual(
      expect.objectContaining({
        markVariantDirty: { app: expressApp },
        handleRequest: expect.any(Function),
        app: expressApp,
      })
    );
  });

  test('handles a request and returns a not-found response when no variant exists', async () => {
    const ensureFirebaseApp = jest.fn();
    const createFirebaseAppManager = jest.fn(initializer => ({
      ensureFirebaseApp: () => {
        ensureFirebaseApp();
        initializer();
      },
    }));
    const initializeApp = jest.fn();
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'admin-uid' });
    const getAuth = jest.fn(() => ({ verifyIdToken }));
    const get = jest.fn().mockResolvedValue({ docs: [] });
    const limit = jest.fn(() => ({ get }));
    const where = jest.fn(() => ({ limit }));
    const collectionGroup = jest.fn(() => ({ where }));
    const authorRef = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const authorGet = jest.fn().mockResolvedValue({
      docs: [{ ref: authorRef }],
    });
    const authorLimit = jest.fn(() => ({ get: authorGet }));
    const authorWhere = jest.fn(() => ({ limit: authorLimit }));
    const collection = jest.fn(() => ({ where: authorWhere }));
    const invocationPermissions = [];
    const updateDocument = jest.fn((_, reference, data) =>
      reference.update(data)
    );
    const sendResponse = jest.fn((...args) => {
      const [, res, status, method, body] = args;
      return res.status(status)[method](body);
    });
    const logWarning = jest.fn();
    const getFirestoreInstance = jest.fn(() => ({
      collectionGroup,
      collection,
    }));
    const expressApp = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => expressApp);
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const functions = {
      region: jest.fn(() => ({
        https: {
          onRequest: jest.fn(app => ({ app })),
        },
      })),
    };
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-123',
      PLAYWRIGHT_ORIGIN: 'https://preview.local',
    }));

    const { handleRequest } = runMarkVariantDirty({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getAuth,
      express,
      cors,
      functions,
      getEnvironmentVariables,
      bindStartupEffectBoundary: handler => handler(Object.freeze({})),
      initializeFirebaseApp: (_, initializer) => initializer(),
      bindEffectInvocationBoundary:
        handler =>
        async (...args) => {
          const permission = Object.freeze({ scope: 'invocation' });
          invocationPermissions.push(permission);
          return handler(permission, ...args);
        },
      updateDocument,
      sendResponse,
      logWarning,
      useMiddleware: (_, app, middleware) => app.use(middleware),
      registerPostRoute: (_, app, path, handler) => app.post(path, handler),
      logDebug: jest.fn(),
      ADMIN_UID: 'admin-uid',
    });

    const res = {
      status: jest.fn(function status(code) {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn(),
      send: jest.fn(),
    };

    await handleRequest(
      {
        method: 'POST',
        get: jest.fn(() => 'Bearer token'),
        body: { page: 12, variant: 'alpha' },
      },
      res
    );

    expect(verifyIdToken).toHaveBeenCalledWith('token');
    expect(collectionGroup).toHaveBeenCalledWith('pages');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(sendResponse).toHaveBeenNthCalledWith(
      1,
      invocationPermissions[0],
      res,
      404,
      'json',
      { error: 'Variant not found' }
    );

    res.status.mockClear();
    await handleRequest(
      {
        method: 'POST',
        get: jest.fn(() => 'Bearer token'),
        body: { authorId: 'author-1' },
      },
      res
    );

    expect(collection).toHaveBeenCalledWith('authors');
    expect(authorWhere).toHaveBeenCalledWith('uuid', '==', 'author-1');
    expect(authorRef.update).toHaveBeenNthCalledWith(1, { dirty: false });
    expect(authorRef.update).toHaveBeenNthCalledWith(2, { dirty: true });
    expect(updateDocument).toHaveBeenNthCalledWith(
      1,
      invocationPermissions[1],
      authorRef,
      { dirty: false }
    );
    expect(sendResponse).toHaveBeenNthCalledWith(
      2,
      invocationPermissions[1],
      res,
      200,
      'json',
      { ok: true }
    );

    await handleRequest(
      {
        method: 'POST',
        get: jest.fn(() => 'Bearer token'),
        body: { authorId: 'author-1' },
      },
      res
    );

    expect(invocationPermissions[2]).not.toBe(invocationPermissions[1]);
    expect(updateDocument).toHaveBeenNthCalledWith(
      3,
      invocationPermissions[2],
      authorRef,
      { dirty: false }
    );

    await verifyResponseBranches(handleRequest, res, {
      get,
      verifyIdToken,
      sendResponse,
      logWarning,
    });
  });
});
