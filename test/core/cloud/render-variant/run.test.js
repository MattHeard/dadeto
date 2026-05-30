import { describe, expect, jest, test } from '@jest/globals';

const ensureFirebaseApp = jest.fn();
const importedFetchFn = jest.fn(() => Promise.resolve({ ok: true }));
const onWrite = jest.fn(() => 'renderVariant');
const createRenderVariant = jest.fn(options =>
  jest.fn(async (...args) => {
    await options.fetchFn(...args);
    return null;
  })
);
const createHandleVariantWrite = jest.fn(() => jest.fn(() => 'handled'));
const region = jest.fn(() => ({
  firestore: {
    document: jest.fn(() => ({
      onWrite,
    })),
  },
}));

jest.unstable_mockModule(
  '../../../../src/core/cloud/render-variant/render-variant-core.js',
  () => ({
    DEFAULT_BUCKET_NAME: 'bucket',
    VISIBILITY_THRESHOLD: 1,
    buildAltsHtml: jest.fn(() => 'alts'),
    buildHtml: jest.fn(() => 'html'),
    getVisibleVariants: jest.fn(() => ['visible']),
    resolveStaticBucketName: jest.fn(() => 'resolved-bucket'),
    resolveStaticObjectPrefix: jest.fn(() => 'prefix'),
    createHandleVariantWrite,
    createRenderVariant,
  })
);

const { runRenderVariant } = await import(
  '../../../../src/core/cloud/render-variant/run.js'
);

describe('runRenderVariant', () => {
  test('wires the cloud entrypoint and uses the global fetch path', async () => {
    createRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    const globalFetch = jest.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = globalFetch;

    const initializeApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const getFirestoreInstance = jest.fn(() => ({ firestore: true }));
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ storage: true }));
    const FieldValue = { delete: jest.fn(() => 'delete-sentinel') };
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const functions = { region };

    const { renderVariant, render } = runRenderVariant({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
    });

    expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(renderVariant).toBe('renderVariant');

    await render('snap', 'context');

    expect(createRenderVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchFn: expect.any(Function),
        bucketName: 'resolved-bucket',
        objectPrefix: 'prefix',
      })
    );
    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(importedFetchFn).not.toHaveBeenCalled();
  });

  test('falls back to the imported fetch helper when global fetch is missing', async () => {
    createRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

    const initializeApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const getFirestoreInstance = jest.fn(() => ({ firestore: true }));
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ storage: true }));
    const FieldValue = { delete: jest.fn(() => 'delete-sentinel') };
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const functions = { region };

    const { render } = runRenderVariant({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
    });
    await render('snap', 'context');

    expect(createRenderVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchFn: expect.any(Function),
      })
    );
    expect(importedFetchFn).toHaveBeenCalledTimes(1);

    globalThis.fetch = previousFetch;
  });
});
