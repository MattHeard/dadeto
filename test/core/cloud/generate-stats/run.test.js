import { jest } from '@jest/globals';

/**
 * Load the run helper with mocked core dependencies.
 * @param {{environment?: Record<string, string | undefined>, firestoreResult?: {label: string}}} [options] Runtime fixtures.
 * @returns {Promise<{
 *   mod: typeof import('../../../../src/core/cloud/generate-stats/run.js'),
 *   initializeApp: jest.Mock,
 *   initializeFirebaseApp: jest.Mock,
 *   createGenerateStatsCore: jest.Mock,
 *   coreResult: Record<string, jest.Mock>,
 *   deps: {
 *     db: { label: string },
 *     auth: { kind: string },
 *     storage: object,
 *     fetchFn: jest.Mock,
 *     env: Record<string, string | undefined>,
 *     cryptoModule: { randomUUID: jest.Mock },
 *     console: typeof console,
 *     functions: { region: jest.Mock },
 *     express: jest.Mock,
 *     cors: jest.Mock,
 *   },
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
  express.json = jest.fn(() => 'json-middleware');
  express.urlencoded = jest.fn(() => 'urlencoded-middleware');
  const onRequest = jest.fn(() => 'generateStats-export');
  const functions = {
    region: jest.fn(() => ({
      https: { onRequest },
    })),
  };
  const auth = { kind: 'auth' };
  const storage = { kind: 'storage' };
  const fetchFn = jest.fn();
  const getFirestore = jest.fn(() => firestoreResult);
  const crypto = { randomUUID: jest.fn(() => 'uuid') };
  const console = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const deps = {
    db: firestoreResult,
    auth,
    storage,
    fetchFn,
    env: environment,
    cryptoModule: crypto,
    console,
    functions,
    express,
    cors,
  };

  let mod;

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule('firebase-admin/app', () => ({
      initializeApp,
    }));
    await jest.unstable_mockModule('firebase-admin/firestore', () => ({
      getFirestore,
    }));
    await jest.unstable_mockModule(
      '../../../../src/core/cloud/generate-stats/generate-stats-core.js',
      () => ({
        createGenerateStatsCore,
        initializeFirebaseApp,
        productionOrigins,
      })
    );

    mod = await import('../../../../src/core/cloud/generate-stats/run.js');
  });

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
    deps,
    getFirestore,
    firestoreResult,
  };
}

describe('generate-stats run', () => {
  it('initializes Firebase once', async () => {
    const { mod } = await loadModule();
    const initFn = jest.fn();

    const ensure = mod.createEnsureFirebaseApp(initFn);

    ensure();
    ensure();

    expect(initFn).toHaveBeenCalledTimes(1);
  });

  it('resolves the configured origins', async () => {
    const { mod } = await loadModule();

    const productionOrigins = [
      'https://mattheard.net',
      'https://dendritestories.co.nz',
      'https://www.dendritestories.co.nz',
    ];
    const mockedOrigins = ['https://prod.example'];
    const prodOrigins = mod.getAllowedOrigins({
      DENDRITE_ENVIRONMENT: 'prod',
      PLAYWRIGHT_ORIGIN: 'https://playwright.example',
    });
    const devOrigins = mod.getAllowedOrigins({
      DENDRITE_ENVIRONMENT: 'dev',
    });

    expect([productionOrigins, mockedOrigins]).toContainEqual(prodOrigins);
    expect(devOrigins).toEqual(prodOrigins);
    expect(
      mod.getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      })
    ).toEqual(['https://playwright.example']);
    expect(mod.getAllowedOrigins({ DENDRITE_ENVIRONMENT: 't-123' })).toEqual(
      []
    );
  });

  it('parses firestore database ids from the environment', async () => {
    const { mod } = await loadModule();

    expect(
      mod.resolveFirestoreDatabaseId({
        DATABASE_ID: 'custom-db',
      })
    ).toBe('custom-db');
    expect(
      mod.resolveFirestoreDatabaseId({
        DENDRITE_ENVIRONMENT: 't-123',
      })
    ).toBe('t-123');
    expect(() => mod.resolveFirestoreDatabaseId({})).toThrow(
      'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
    );
  });

  it('selects firestore databases for both custom and default modes', async () => {
    const { mod } = await loadModule();
    const getFirestoreFn = jest.fn((...args) => args);

    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, undefined, 'custom-db')
    ).toEqual([undefined, 'custom-db']);
    expect(getFirestoreFn).toHaveBeenLastCalledWith(undefined, 'custom-db');

    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, { app: true }, 'custom-db')
    ).toEqual([{ app: true }, 'custom-db']);
    expect(
      mod.selectFirestoreDatabase(getFirestoreFn, { app: true }, '(default)')
    ).toEqual([{ app: true }]);
  });

  it('caches the default firestore instance', async () => {
    const { mod } = await loadModule();
    const originalDatabaseId = process.env.DATABASE_ID;
    process.env.DATABASE_ID = 'cached-db';

    try {
      const first = mod.getFirestoreInstance();
      const second = mod.getFirestoreInstance();

      expect(first).toBe(second);
    } finally {
      if (originalDatabaseId === undefined) {
        delete process.env.DATABASE_ID;
      } else {
        process.env.DATABASE_ID = originalDatabaseId;
      }
    }
  });

  it('uses custom firestore dependencies when provided', async () => {
    const { mod } = await loadModule();
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn((...args) => args);

    const result = mod.getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {
        DATABASE_ID: 'custom-db',
      },
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined, 'custom-db');
    expect(result).toEqual([undefined, 'custom-db']);
  });

  it('rejects a non-function firestore factory', async () => {
    const { mod } = await loadModule();

    expect(() =>
      mod.getFirestoreInstance({
        getFirestoreFn: null,
      })
    ).toThrow(new TypeError('getFirestoreFn must be a function'));
  });

  it('wires the cloud handler and returns the function export', async () => {
    const { mod, app, cors, express, functions, onRequest, deps } =
      await loadModule({
        environment: {
          DENDRITE_ENVIRONMENT: 't-123',
          PLAYWRIGHT_ORIGIN: 'https://playwright.example',
          DATABASE_ID: 'custom-db',
        },
      });

    const result = mod.runGenerateStats(deps);

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
    expect(app.post).toHaveBeenCalledWith('/', expect.any(Function));
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(app);
    expect(result.generateStats).toBe('generateStats-export');
    expect(typeof result.getStoryCount).toBe('function');
    expect(typeof result.getPageCount).toBe('function');
    expect(typeof result.getUnmoderatedPageCount).toBe('function');
    expect(typeof result.getTopStories).toBe('function');
    expect(typeof result.generate).toBe('function');
    expect(typeof result.handleRequest).toBe('function');
  });

  it('requires the runtime environment label when wiring origins', async () => {
    const { mod, deps } = await loadModule({
      environment: {
        DATABASE_ID: 'custom-db',
      },
    });

    expect(() => mod.runGenerateStats(deps)).toThrow(
      'DENDRITE_ENVIRONMENT is required to resolve allowed origins.'
    );
  });

  it('builds the cloud handle from runtime dependencies', async () => {
    const { mod, functions, express, cors, onRequest, getFirestore } =
      await loadModule({
        environment: {
          DENDRITE_ENVIRONMENT: 't-123',
        },
      });
    const Storage = jest.fn(function Storage() {
      return { kind: 'storage-instance' };
    });
    const getAuth = jest.fn(() => ({ kind: 'auth-instance' }));
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-456',
      PLAYWRIGHT_ORIGIN: 'https://playwright.example',
    }));
    const initializeApp = jest.fn();
    const fetchFn = jest.fn();
    const crypto = { randomUUID: jest.fn(() => 'uuid') };

    const handle = mod.createGenerateStatsHandle({
      Storage,
      cors,
      express,
      functions,
      getAuth,
      getFirestore,
      getEnvironmentVariables,
      initializeApp,
      fetchFn,
      crypto,
    });

    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(Storage).toHaveBeenCalledTimes(1);
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(handle).toBe('generateStats-export');
  });

  it('uses the global console when none is provided', async () => {
    const { mod, deps } = await loadModule({
      environment: {
        DENDRITE_ENVIRONMENT: 't-123',
      },
    });

    expect(() =>
      mod.runGenerateStats({ ...deps, console: undefined })
    ).not.toThrow();
  });
});
