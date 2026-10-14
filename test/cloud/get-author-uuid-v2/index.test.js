import { describe, expect, it, jest } from '@jest/globals';

describe('get-author-uuid-v2 entry point', () => {
  it('mints a fresh frozen capability for each HTTP request', async () => {
    const internalHandler = jest.fn(async () => {});
    const startupPermission = Object.freeze({ startup: true });
    const initializeApp = jest.fn();
    const getFirestoreInstance = jest.fn(() => ({}));
    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp,
      }));
      await jest.unstable_mockModule('firebase-admin/auth', () => ({
        getAuth: jest.fn(() => ({})),
      }));
      await jest.unstable_mockModule('firebase-admin/firestore', () => ({
        getFirestore: jest.fn(),
      }));
      await jest.unstable_mockModule(
        '../../../src/cloud/common-gcf.js',
        () => ({
          createFirebaseAppManager: jest.fn(initializer => ({
            ensureFirebaseApp: jest.fn(permission => initializer(permission)),
          })),
        })
      );
      await jest.unstable_mockModule('../../../src/cloud/firestore.js', () => ({
        getFirestoreInstance,
      }));
      await jest.unstable_mockModule(
        '../../../src/cloud/allow-effects.js',
        () => ({
          createEffectStartupBoundary: handler => handler(startupPermission),
          createEffectHttpBoundary: handler => (req, res) =>
            handler(Object.freeze({ request: true }), req, res),
        })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/get-author-uuid-v2/startup-effect-adapter.js',
        () => ({
          initializeFirebaseApp: (permission, initializer) => {
            expect(permission).toBe(startupPermission);
            return initializer(permission);
          },
        })
      );
      await jest.unstable_mockModule(
        '../../../src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js',
        () => ({
          createGetAuthorUuidV2ExpressHandle: jest.fn(() => internalHandler),
        })
      );
      mod = await import('../../../src/cloud/get-author-uuid-v2/index.js');
    });

    await mod.handle({}, {});
    await mod.handle({}, {});

    const firstPermission = internalHandler.mock.calls[0][0];
    const secondPermission = internalHandler.mock.calls[1][0];
    expect(Object.isFrozen(firstPermission)).toBe(true);
    expect(Object.isFrozen(secondPermission)).toBe(true);
    expect(firstPermission).not.toBe(secondPermission);
    expect(firstPermission).not.toBe(startupPermission);
    expect(initializeApp).toHaveBeenCalledTimes(1);

    const firestoreOptions = getFirestoreInstance.mock.calls[0][1];
    firestoreOptions.ensureAppFn(startupPermission);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
