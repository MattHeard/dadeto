import { describe, expect, it, jest } from '@jest/globals';

describe('process-new-story entry point', () => {
  it('initializes Firestore with startup permission and does not retain it', async () => {
    const startupPermission = Object.freeze({ startup: true });
    const database = { database: true };
    const initializeApp = jest.fn(() => ({ app: true }));
    const getFirestoreInstance = jest.fn(() => database);
    const createProcessNewStoryHandle = jest.fn(() => ({ handle: true }));
    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp,
      }));
      await jest.unstable_mockModule(
        '../../../src/cloud/process-new-story/process-new-story-gcf.js',
        () => ({
          functions: {},
          FieldValue: {},
          getFirestoreInstance,
          createFirebaseAppManager: jest.fn(initializer => ({
            ensureFirebaseApp: jest.fn(() => initializer()),
          })),
        })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/allow-effects.js',
        () => ({
          createEffectStartupBoundary: handler => handler(startupPermission),
          createEffectInvocationBoundary: handler => handler,
        })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/process-new-story/startup-effect-adapter.js',
        () => ({
          initializeFirebaseApp: (permission, initializer) => {
            expect(permission).toBe(startupPermission);
            return initializer();
          },
        })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/process-new-page/effect-adapters.js',
        () => ({ createSubmissionBatch: jest.fn() })
      );
      await jest.unstable_mockModule(
        '../../../src/core/cloud/process-new-story/process-new-story-core.js',
        () => ({ createProcessNewStoryHandle })
      );
      mod = await import('../../../src/cloud/process-new-story/index.js');
    });

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(getFirestoreInstance).toHaveBeenCalledTimes(1);
    const firestoreOptions = getFirestoreInstance.mock.calls[0][0];
    expect(firestoreOptions.ensureAppFn).toBeDefined();
    firestoreOptions.ensureAppFn();
    expect(initializeApp).toHaveBeenCalledTimes(1);

    const options = createProcessNewStoryHandle.mock.calls[0][0];
    expect(options.getFirestoreInstance()).toBe(database);
    expect(mod.handle).toEqual({ handle: true });
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
