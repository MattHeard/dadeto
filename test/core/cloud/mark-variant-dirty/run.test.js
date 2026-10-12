import { jest } from '@jest/globals';
import { runMarkVariantDirty } from '../../../../src/core/cloud/mark-variant-dirty/run.js';

describe('runMarkVariantDirty', () => {
  test('wires the endpoint and returns exports', () => {
    const startupPermissions = [];
    const ensureFirebaseApp = jest.fn(initializer => initializer());
    const createFirebaseAppManager = jest.fn(initializer => ({
      ensureFirebaseApp: () => ensureFirebaseApp(initializer),
    }));
    const initializeApp = jest.fn();
    const initializeFirebaseApp = jest.fn((_, initializer) => initializer());
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
      useMiddleware: (permission, app, middleware) => {
        expect(Object.isFrozen(permission)).toBe(true);
        app.use(middleware);
      },
      registerPostRoute: (permission, app, path, handler) => {
        expect(Object.isFrozen(permission)).toBe(true);
        app.post(path, handler);
      },
      logDebug: jest.fn(),
      ADMIN_UID: 'admin-uid',
    });

    expect(createFirebaseAppManager).toHaveBeenCalledWith(expect.any(Function));
    expect(ensureFirebaseApp).toHaveBeenCalled();
    expect(initializeFirebaseApp).toHaveBeenCalledWith(
      startupPermissions[0],
      initializeApp
    );
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(getFirestoreInstance).toHaveBeenCalledWith({
      ensureAppFn: expect.any(Function),
      environment: {
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://preview.local',
      },
    });
    getFirestoreInstance.mock.calls[0][0].ensureAppFn();
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
    expect(res.json).toHaveBeenCalledWith({ error: 'Variant not found' });

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
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
