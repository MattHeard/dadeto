import { jest } from '@jest/globals';
import { createAssignModerationJobEntrypoint } from '../../../../src/core/cloud/assign-moderation-job/index.js';

describe('createAssignModerationJobEntrypoint', () => {
  test('wires the entrypoint and exposes the Firestore helpers', () => {
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
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ rootPage: { get: jest.fn() } }),
          }),
        })),
      })),
    }));
    const express = Object.assign(
      jest.fn(() => ({
        use: jest.fn(),
        post: jest.fn(),
      })),
      {
        urlencoded: jest.fn(() => jest.fn()),
      }
    );
    const entrypoint = createAssignModerationJobEntrypoint({
      functions,
      express,
      cors: jest.fn(() => jest.fn()),
      initializeApp: jest.fn(),
      getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
      getFirestore,
      getEnvironmentVariables: jest.fn(() => ({
        DENDRITE_ENVIRONMENT: 'prod',
      })),
      now: jest.fn(() => 123),
      random: jest.fn(() => 0.5),
    });

    expect(entrypoint.handle).toBeDefined();
    expect(
      entrypoint.testing.resolveFirestoreDatabaseId({
        FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
      })
    ).toBe('custom-db');

    const firestore = entrypoint.testing.getFirestoreInstance({
      ensureAppFn: jest.fn(),
      getFirestoreFn: getFirestore,
      environment: {
        FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
      },
    });

    expect(firestore).toBeDefined();
    expect(getFirestore).toHaveBeenCalledTimes(2);

    const nullEnvironmentFirestore = entrypoint.testing.getFirestoreInstance({
      ensureAppFn: jest.fn(),
      getFirestoreFn: getFirestore,
      environment: null,
    });

    expect(nullEnvironmentFirestore).toBeDefined();

    const defaultFirestore = entrypoint.testing.getFirestoreInstance();
    const cachedDefaultFirestore = entrypoint.testing.getFirestoreInstance();

    expect(cachedDefaultFirestore).toBe(defaultFirestore);

    expect(() => entrypoint.testing.ensureFirebaseApp()).not.toThrow();

    entrypoint.testing.firebaseInitialization.reset();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(() => {
        throw new Error('already exists');
      })
    ).not.toThrow();

    entrypoint.testing.firebaseInitialization.reset();
    expect(() =>
      entrypoint.testing.ensureFirebaseApp(() => {
        throw new Error('boom');
      })
    ).toThrow('boom');

    entrypoint.testing.clearFirestoreInstanceCache();
  });
});
