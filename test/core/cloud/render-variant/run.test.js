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

jest.unstable_mockModule('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

jest.unstable_mockModule(
  '../../../../src/cloud/render-variant/render-variant-gcf.js',
  () => ({
    functions: { region },
    FieldValue: { delete: jest.fn(() => 'delete-sentinel') },
    Storage: jest.fn(() => ({ storage: true })),
    createFirebaseAppManager: jest.fn(() => ({ ensureFirebaseApp })),
    getFirestoreInstance: jest.fn(() => ({ firestore: true })),
    fetchFn: importedFetchFn,
    crypto: { randomUUID: jest.fn(() => 'uuid') },
    getEnvironmentVariables: jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    })),
  })
);

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

    const { renderVariant, render } = runRenderVariant();

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

    const { render } = runRenderVariant();
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
