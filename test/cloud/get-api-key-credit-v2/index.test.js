import { describe, expect, it, jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';

describe('get-api-key-credit-v2 entry point', () => {
  it('resolves Firestore through the environment-aware cloud helper', async () => {
    const source = await readFile(
      'src/cloud/get-api-key-credit-v2/index.js',
      'utf8'
    );
    expect(source).toContain(
      "import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';"
    );
    expect(source).toContain('getFirestoreInstance');
    expect(source).toContain('getFirestoreFn: getAdminFirestore');
  });

  it('exports a live handler from the wrapper module', async () => {
    const previousDatabaseId = process.env.DATABASE_ID;
    process.env.DATABASE_ID = 't-test';

    let mod;

    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('firebase-admin/app', () => ({
        initializeApp: jest.fn(),
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
        getFirestoreInstance: jest.fn(() => ({ mocked: true })),
      }));
      await jest.unstable_mockModule(
        '../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js',
        () => ({
          createGetApiKeyCreditV2ExpressHandle: jest.fn(() => async () => ({
            status: 200,
            body: { ok: true },
          })),
        })
      );
      mod = await import('../../../src/cloud/get-api-key-credit-v2/index.js');
    });

    expect(mod.handle).toBeDefined();

    process.env.DATABASE_ID = previousDatabaseId;
  });
});
