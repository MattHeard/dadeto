import { jest } from '@jest/globals';

describe('cloud generate-stats entrypoint', () => {
  it('passes cloud dependencies into the core runner', async () => {
    const handle = { label: 'generate-stats' };
    const createGenerateStatsHandle = jest.fn(() => handle);
    const storageSave = jest.fn(async () => {});
    const storageFile = jest.fn(() => ({ save: storageSave }));
    const storageBucket = jest.fn(() => ({ file: storageFile }));
    const Storage = jest.fn(function Storage() {
      return { bucket: storageBucket };
    });
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
      DATABASE_ID: 'dev-db',
    }));
    const fetchFn = jest.fn();
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const OAuth2Client = jest.fn(function OAuth2Client() {
      this.verifyIdToken = jest.fn();
    });

    await jest.unstable_mockModule(
      '../../src/cloud/generate-stats/firebase-functions.js',
      () => ({
        default: {
          region: functions.region,
        },
      })
    );
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
        OAuth2Client,
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
        saveStatsHtml: expect.any(Function),
        cors,
        express,
        functions,
        getAuth,
        getFirestore,
        getEnvironmentVariables: expect.any(Function),
        initializeApp: expect.any(Function),
        fetchFn: expect.any(Function),
        effectFetchFn: expect.any(Function),
        bindEffectBoundary: expect.any(Function),
        crypto,
        verifySchedulerRequest: expect.any(Function),
      })
    );
    const coreDeps = createGenerateStatsHandle.mock.calls[0][0];
    const permission = Object.freeze({});
    coreDeps.fetchFn(permission, 'https://example.com', { method: 'GET' });
    expect(fetchFn).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
    });
    await coreDeps.saveStatsHtml(permission, 'bucket', 'stats.html', '<html/>');
    expect(Storage).toHaveBeenCalledTimes(1);
    expect(storageBucket).toHaveBeenCalledWith('bucket');
    expect(storageFile).toHaveBeenCalledWith('stats.html');
    expect(storageSave).toHaveBeenCalledWith('<html/>', {
      contentType: 'text/html',
      metadata: { cacheControl: 'no-cache' },
    });
    expect(module.handle).toBe(handle);
  });
});
