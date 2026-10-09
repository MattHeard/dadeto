import { jest } from '@jest/globals';
import { createAssignModerationJobEntrypoint } from '../../../../src/core/cloud/assign-moderation-job/index.js';

describe('createAssignModerationJobEntrypoint', () => {
  test('wires the entrypoint and exposes the Firestore helpers', async () => {
    const functions = {
      region: jest.fn(() => ({
        firestore: {
          document: jest.fn(() => ({
            onCreate(handler) {
              return handler;
            },
          })),
        },
        https: {
          onRequest(handler) {
            return handler;
          },
        },
      })),
    };
    const getFirestore = jest.fn(() => ({
      collectionGroup: jest.fn(name => {
        if (name !== 'variants') {
          throw new Error(`Unexpected collectionGroup ${name}`);
        }

        return {
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
      }),
      collection: jest.fn(name => {
        if (name === 'moderationRatings') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ docs: [] }),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ rootPage: { get: jest.fn() } }),
            }),
          })),
        };
      }),
    }));
    const app = { use: jest.fn(), post: jest.fn() };
    const corsMiddleware = jest.fn();
    const urlencodedMiddleware = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({
        ...app,
      })),
      {
        urlencoded: jest.fn(() => urlencodedMiddleware),
      }
    );
    const allowEffects =
      /** @type {import('../../../../types/allow-effects').AllowEffects} */ (
        /** @type {unknown} */ (Object.freeze({}))
      );
    const useMiddleware = jest.fn((permission, appInstance, middleware) => {
      void permission;
      appInstance.use(middleware);
    });
    const registerPostRoute = jest.fn(
      (permission, appInstance, path, handler) => {
        void permission;
        appInstance.post(path, handler);
      }
    );
    const setModeratorAssignment = jest.fn(async () => {});
    const initializeApp = jest.fn();
    const initializeFirebaseApp = jest.fn((permission, initFn) => {
      void permission;
      return initFn();
    });
    const sendHttpResponse = jest.fn((permission, response, status, body) => {
      void permission;
      response.status(status).send(body);
    });
    const entrypoint = await createAssignModerationJobEntrypoint({
      functions,
      express,
      cors: jest.fn(() => corsMiddleware),
      initializeApp,
      initializeFirebaseApp,
      getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
      getFirestore,
      getEnvironmentVariables: jest.fn(() => ({
        DENDRITE_ENVIRONMENT: 'prod',
        DATABASE_ID: 'prod-db',
      })),
      now: jest.fn(() => 123),
      random: jest.fn(() => 0.5),
      bindEffectBoundary: handler => handler(allowEffects),
      useMiddleware,
      registerPostRoute,
      setModeratorAssignment,
      sendHttpResponse,
    });

    expect(useMiddleware).toHaveBeenNthCalledWith(
      1,
      allowEffects,
      app,
      corsMiddleware
    );
    expect(useMiddleware).toHaveBeenNthCalledWith(
      2,
      allowEffects,
      app,
      urlencodedMiddleware
    );
    expect(app.use.mock.calls).toEqual([
      [corsMiddleware],
      [urlencodedMiddleware],
    ]);
    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(initializeFirebaseApp).toHaveBeenCalledWith(
      allowEffects,
      initializeApp
    );
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(registerPostRoute).toHaveBeenCalledWith(
      allowEffects,
      app,
      '/',
      expect.any(Function)
    );

    expect(entrypoint.handle).toBeDefined();
    expect(
      entrypoint.testing.resolveFirestoreDatabaseId({
        DATABASE_ID: 'custom-db',
      })
    ).toBe('custom-db');

    const firestore = entrypoint.testing.getFirestoreInstance({
      ensureAppFn: jest.fn(),
      getFirestoreFn: getFirestore,
      environment: {
        DATABASE_ID: 'custom-db',
      },
    });

    expect(firestore).toBeDefined();
    expect(getFirestore).toHaveBeenCalledTimes(2);

    expect(() =>
      entrypoint.testing.getFirestoreInstance({
        ensureAppFn: jest.fn(),
        getFirestoreFn: getFirestore,
        environment: null,
      })
    ).toThrow(
      'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
    );

    const defaultFirestore = entrypoint.testing.getFirestoreInstance();
    const cachedDefaultFirestore = entrypoint.testing.getFirestoreInstance();

    expect(cachedDefaultFirestore).toBe(defaultFirestore);

    entrypoint.testing.firebaseInitialization.reset();
    const ensureOnce = jest.fn();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(allowEffects, ensureOnce)
    ).not.toThrow();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(allowEffects, ensureOnce)
    ).not.toThrow();
    expect(ensureOnce).toHaveBeenCalledTimes(1);

    entrypoint.testing.firebaseInitialization.reset();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(allowEffects, () => {
        throw new Error('already exists');
      })
    ).not.toThrow();

    entrypoint.testing.firebaseInitialization.reset();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(allowEffects, () => {
        throw new Error('boom');
      })
    ).toThrow('boom');

    entrypoint.testing.firebaseInitialization.markInitialized();
    entrypoint.testing.clearFirestoreInstanceCache();
    expect(entrypoint.testing.firebaseInitialization.hasBeenInitialized()).toBe(
      false
    );
  });
});
