import { jest } from '@jest/globals';

describe('cloud generate-stats entrypoint', () => {
  it('passes cloud dependencies into the core runner', async () => {
    const handle = { label: 'generate-stats' };
    const createGenerateStatsHandle = jest.fn(() => handle);
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
        createGenerateStatsHandle,
      })
    );

    const module = await import('../../src/cloud/generate-stats/index.js');

    expect(createGenerateStatsHandle).toHaveBeenCalledTimes(1);
    expect(createGenerateStatsHandle).toHaveBeenCalledWith(
      expect.objectContaining({
        Storage,
        cors,
        express,
        functions,
        getAuth,
        getFirestore,
        getEnvironmentVariables,
        initializeApp: expect.any(Function),
        fetchFn,
        crypto,
      })
    );
    expect(module.handle).toBe(handle);
  });
});
