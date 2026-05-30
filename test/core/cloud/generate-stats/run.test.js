import { jest } from '@jest/globals';

/**
 * Load the run helper with mocked cloud dependencies.
 * @param {{environment?: Record<string, string | undefined>, firestoreResult?: {label: string}}} [options] Runtime fixtures.
 * @returns {Promise<{
 *   mod: typeof import('../../../../src/core/cloud/generate-stats/run.js'),
 *   initializeApp: jest.Mock,
 *   initializeFirebaseApp: jest.Mock,
 *   createGenerateStatsCore: jest.Mock,
 *   coreResult: Record<string, jest.Mock>,
 *   app: { use: jest.Mock, post: jest.Mock },
 *   cors: jest.Mock,
 *   express: jest.Mock,
 *   functions: { region: jest.Mock },
 *   onRequest: jest.Mock,
 *   getAuth: jest.Mock,
 *   getFirestore: jest.Mock,
 *   getEnvironmentVariables: jest.Mock,
 *   Storage: jest.Mock,
 *   crypto: { randomUUID: jest.Mock },
 * }>} Mocked module bundle.
 */
async function loadModule({
  environment = {},
  firestoreResult = { label: 'firestore' },
} = {}) {
  jest.resetModules();

  const initializeApp = jest.fn();
  const initializeFirebaseApp = jest.fn(initFn => {
    if (typeof initFn === 'function') {
      initFn();
    }
  });
  const productionOrigins = ['https://prod.example'];
  const coreResult = {
    getStoryCount: jest.fn(),
    getPageCount: jest.fn(),
    getUnmoderatedPageCount: jest.fn(),
    getTopStories: jest.fn(),
    generate: jest.fn(),
    handleRequest: jest.fn(),
  };
  const createGenerateStatsCore = jest.fn(() => coreResult);
  const app = {
    use: jest.fn(),
    post: jest.fn(),
  };
  const cors = jest.fn(() => 'cors-middleware');
  const express = jest.fn(() => app);
  const onRequest = jest.fn(() => 'generateStats-export');
  const functions = {
    region: jest.fn(() => ({
      https: { onRequest },
    })),
  };
  const getAuth = jest.fn(() => ({ kind: 'auth' }));
  const getFirestore = jest.fn(() => firestoreResult);
  const getEnvironmentVariables = jest.fn(() => environment);
  const Storage = jest.fn(function Storage() {});
  const crypto = { randomUUID: jest.fn(() => 'uuid') };

  await jest.unstable_mockModule('firebase-admin/app', () => ({
    initializeApp,
  }));
  await jest.unstable_mockModule(
    '../../../../src/cloud/generate-stats/generate-stats-gcf.js',
    () => ({
      Storage,
      functions,
      express,
      cors,
      getAuth,
      getFirestore,
      getEnvironmentVariables,
      crypto,
    })
  );
  await jest.unstable_mockModule(
    '../../../../src/core/cloud/generate-stats/generate-stats-core.js',
    () => ({
      createGenerateStatsCore,
      initializeFirebaseApp,
      productionOrigins,
    })
  );

  const mod = await import('../../../../src/core/cloud/generate-stats/run.js');

  return {
    mod,
    initializeApp,
    initializeFirebaseApp,
    createGenerateStatsCore,
    coreResult,
    app,
    cors,
    express,
    functions,
    onRequest,
    getAuth,
    getFirestore,
    getEnvironmentVariables,
    Storage,
    crypto,
    firestoreResult,
  };
}

describe('generate-stats run', () => {
  it('initializes Firebase once', async () => {
    const { mod, initializeFirebaseApp } = await loadModule();
    const initFn = jest.fn();

    const ensure = mod.createEnsureFirebaseApp(initFn);

    ensure();
    ensure();

    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(initializeFirebaseApp).toHaveBeenCalledWith(initFn);
    expect(initFn).toHaveBeenCalledTimes(1);
  });

  it('resolves the configured origins', async () => {
    const { mod } = await loadModule();

    expect(
      mod.getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 'prod',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      })
    ).toEqual(['https://prod.example']);
    expect(
      mod.getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      })
    ).toEqual(['https://playwright.example']);
    expect(
      mod.getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-123',
      })
    ).toEqual([]);
    expect(
      mod.getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 'dev',
      })
    ).toEqual(['https://prod.example']);
  });

  it('parses firestore database ids from the environment', async () => {
    const { mod } = await loadModule();

    expect(
      mod.resolveFirestoreDatabaseId({
        FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
      })
    ).toBe('custom-db');
    expect(
      mod.resolveFirestoreDatabaseId({
        FIREBASE_CONFIG: JSON.stringify({ databaseId: '   ' }),
      })
    ).toBeNull();
    expect(
      mod.resolveFirestoreDatabaseId({
        FIREBASE_CONFIG: '0',
      })
    ).toBeNull();
    expect(mod.resolveFirestoreDatabaseId({ FIREBASE_CONFIG: '' })).toBeNull();
    expect(
      mod.resolveFirestoreDatabaseId({ FIREBASE_CONFIG: 'not-json' })
    ).toBeNull();
  });

  it('selects firestore databases for both custom and default modes', async () => {
    const { mod } = await loadModule();
    const getFirestoreFn = jest.fn((...args) => args);

    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, undefined, 'custom-db')
    ).toEqual(['custom-db']);
    expect(getFirestoreFn).toHaveBeenLastCalledWith('custom-db');

    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, { app: true }, 'custom-db')
    ).toEqual([{ app: true }, 'custom-db']);
    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, { app: true }, '(default)')
    ).toEqual([{ app: true }]);
  });

  it('caches the default firestore instance', async () => {
    const { mod, getFirestore, initializeFirebaseApp } = await loadModule();

    const first = mod.getFirestoreInstance();
    const second = mod.getFirestoreInstance();

    expect(first).toBe(second);
    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
  });

  it('uses custom firestore dependencies when provided', async () => {
    const { mod } = await loadModule();
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn((...args) => args);

    const result = mod.getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {
        FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
      },
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith('custom-db');
    expect(result).toEqual(['custom-db']);
  });

  it('wires the cloud handler and returns the function export', async () => {
    const {
      mod,
      createGenerateStatsCore,
      coreResult,
      app,
      cors,
      express,
      functions,
      onRequest,
      getAuth,
      getFirestore,
      getEnvironmentVariables,
      Storage,
      crypto,
    } = await loadModule({
      environment: {
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
        FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
      },
    });

    const result = mod.runGenerateStats();

    expect(getEnvironmentVariables).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(Storage).toHaveBeenCalledTimes(1);
    expect(getFirestore).toHaveBeenCalledWith('custom-db');
    expect(createGenerateStatsCore).toHaveBeenCalledTimes(1);
    expect(createGenerateStatsCore).toHaveBeenCalledWith(
      expect.objectContaining({
        db: expect.any(Object),
        auth: { kind: 'auth' },
        storage: expect.any(Storage),
        fetchFn: expect.any(Function),
        env: {
          DENDRITE_ENVIRONMENT: 't-123',
          PLAYWRIGHT_ORIGIN: 'https://playwright.example',
          FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
        },
        cryptoModule: crypto,
        console: globalThis.console,
      })
    );
    expect(express).toHaveBeenCalledTimes(1);
    expect(cors).toHaveBeenCalledWith({
      origin: expect.any(Function),
      methods: ['POST'],
    });
    const corsOptions = cors.mock.calls[0][0];
    const allowedOriginCallback = jest.fn();
    corsOptions.origin('https://playwright.example', allowedOriginCallback);
    expect(allowedOriginCallback).toHaveBeenCalledWith(null, true);
    const blockedOriginCallback = jest.fn();
    corsOptions.origin('https://blocked.example', blockedOriginCallback);
    expect(blockedOriginCallback).toHaveBeenCalledWith(expect.any(Error));
    expect(app.use).toHaveBeenCalledWith('cors-middleware');
    expect(app.post).toHaveBeenCalledWith('/', coreResult.handleRequest);
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(app);
    expect(result.generateStats).toBe('generateStats-export');
    expect(result.getStoryCount).toBe(coreResult.getStoryCount);
    expect(result.getPageCount).toBe(coreResult.getPageCount);
    expect(result.getUnmoderatedPageCount).toBe(
      coreResult.getUnmoderatedPageCount
    );
    expect(result.getTopStories).toBe(coreResult.getTopStories);
    expect(result.generate).toBe(coreResult.generate);
    expect(result.handleRequest).toBe(coreResult.handleRequest);
  });
});
