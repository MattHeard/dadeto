import { describe, expect, it, jest } from '@jest/globals';

describe('hide-variant-html entry point', () => {
  it('initializes Firebase at startup and does not retain the startup initializer', async () => {
    const startupPermission = Object.freeze({ scope: 'startup' });
    const initializeApp = jest.fn();
    const db = {};
    const createHideVariantHtmlCore = jest.fn(() => ({
      hideVariantHtml: {},
      handleVariantVisibilityChange: jest.fn(),
    }));
    const createFirebaseAppManager = jest.fn(initializer => ({
      ensureFirebaseApp: jest.fn(permission => initializer(permission)),
    }));
    const getFirestoreInstance = jest.fn(() => db);
    const initializeFirebaseApp = jest.fn((permission, initializer) => {
      expect(permission).toBe(startupPermission);
      return initializer(permission);
    });
    let runtime;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp,
      }));
      await jest.unstable_mockModule(
        '../../../src/cloud/hide-variant-html/hide-variant-html-gcf.js',
        () => ({
          functions: {},
          Storage: jest.fn(),
          createFirebaseAppManager,
        })
      );
      await jest.unstable_mockModule('../../../src/cloud/firestore.js', () => ({
        getFirestoreInstance,
      }));
      await jest.unstable_mockModule(
        '../../../src/core/cloud/hide-variant-html/hide-variant-html-core.js',
        () => ({ createHideVariantHtmlCore })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/allow-effects.js',
        () => ({
          createEffectStartupBoundary: handler => handler(startupPermission),
          createEffectInvocationBoundary:
            handler =>
            (...args) =>
              handler(Object.freeze({ scope: 'invocation' }), ...args),
        })
      );
      await jest.unstable_mockModule(
        '../../../src/cloud/hide-variant-html/effect-adapters.js',
        () => ({
          createHideVariantHtmlEffectAdapters: () => ({
            deleteStorageFile: jest.fn(),
          }),
          initializeFirebaseApp,
        })
      );

      runtime = await import('../../../src/cloud/hide-variant-html/index.js');
    });

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(createFirebaseAppManager).toHaveBeenCalledTimes(1);
    expect(
      createFirebaseAppManager.mock.results[0].value.ensureFirebaseApp
    ).toHaveBeenCalledTimes(1);
    expect(getFirestoreInstance).toHaveBeenCalledWith(startupPermission, {
      ensureAppFn: expect.any(Function),
    });
    getFirestoreInstance.mock.calls[0][1].ensureAppFn(startupPermission);
    expect(initializeApp).toHaveBeenCalledTimes(1);

    const coreDependencies = createHideVariantHtmlCore.mock.calls[0][0];
    expect(coreDependencies.db).toBe(db);
    expect(coreDependencies).not.toHaveProperty('initializeApp');
    expect(runtime.handle).toEqual({});
  });
});
