import { jest } from '@jest/globals';

describe('cloud generate-stats entrypoint', () => {
  it('passes cloud dependencies into the core runner', async () => {
    const handle = { label: 'generate-stats' };
    const runGenerateStats = jest.fn(() => ({ generateStats: handle }));
    const Storage = jest.fn(function Storage() {});
    const functions = {
      region: jest.fn(() => ({
        https: { onRequest: jest.fn() },
      })),
    };
    const express = jest.fn(() => ({
      use: jest.fn(),
      post: jest.fn(),
    }));
    const cors = jest.fn(() => 'cors-middleware');
    const getAuth = jest.fn(() => ({ kind: 'auth' }));
    const getFirestore = jest.fn(() => ({ kind: 'firestore' }));
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 'dev',
    }));
    const fetchFn = jest.fn();
    const crypto = { randomUUID: jest.fn(() => 'uuid') };

    await jest.unstable_mockModule(
      '../../src/cloud/generate-stats/generate-stats-gcf.js',
      () => ({
        Storage,
        functions,
        express,
        cors,
        getAuth,
        getFirestore,
        getEnvironmentVariables,
        fetchFn,
        crypto,
        initializeApp: jest.fn(),
      })
    );
    await jest.unstable_mockModule(
      '../../src/core/cloud/generate-stats/run.js',
      () => ({
        createEnsureFirebaseApp: jest.fn(() => jest.fn()),
        getFirestoreInstance: jest.fn(() => ({ kind: 'db' })),
        runGenerateStats,
      })
    );

    const module = await import('../../src/cloud/generate-stats/index.js');

    expect(runGenerateStats).toHaveBeenCalledTimes(1);
    expect(runGenerateStats).toHaveBeenCalledWith(
      expect.objectContaining({
        db: { kind: 'db' },
        auth: { kind: 'auth' },
        storage: expect.any(Storage),
        fetchFn,
        env: {
          DENDRITE_ENVIRONMENT: 'dev',
        },
        cryptoModule: crypto,
        functions,
        express,
        cors,
      })
    );
    expect(module.handle).toBe(handle);
  });
});
