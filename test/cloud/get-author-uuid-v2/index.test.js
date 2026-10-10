import { describe, expect, it, jest } from '@jest/globals';

describe('get-author-uuid-v2 entry point', () => {
  it('mints a fresh frozen capability for each HTTP request', async () => {
    const internalHandler = jest.fn(async () => {});
    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp: jest.fn(),
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
          createFirebaseAppManager: jest.fn(() => ({
            ensureFirebaseApp: jest.fn(),
          })),
        })
      );
      await jest.unstable_mockModule('../../../src/cloud/firestore.js', () => ({
        getFirestoreInstance: jest.fn(() => ({})),
      }));
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
  });
});
