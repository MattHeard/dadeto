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
        DATABASE_ID: 'prod-db',
      })),
      now: jest.fn(() => 123),
      random: jest.fn(() => 0.5),
    });

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
