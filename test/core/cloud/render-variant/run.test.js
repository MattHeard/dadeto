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
const createCloudRenderEntrypointState = jest.fn(() => ({
  db: { doc: jest.fn() },
  render: jest.fn(() => jest.fn(() => 'rendered')),
}));
const createCloudRenderInstanceBuilder = jest.fn(() => jest.fn());
const createFirestoreDocumentOnWriteTrigger = jest.fn(() => jest.fn());
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

jest.unstable_mockModule(
  '../../../../src/core/cloud/render-support.js',
  () => ({
    createCloudRenderInstanceBuilder,
    createCloudRenderEntrypointState,
    createMemoizedLoader: jest.fn(),
  })
);

jest.unstable_mockModule('../../../../src/core/cloud/cloud-core.js', () => ({
  createFirestoreDocumentOnWriteTrigger,
}));

let runRenderVariant;

beforeAll(async () => {
  ({ runRenderVariant } = await import(
    '../../../../src/core/cloud/render-variant/run.js'
  ));
});

describe('runRenderVariant', () => {
  test('wires the cloud entrypoint and uses the global fetch path', async () => {
    createRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    createCloudRenderInstanceBuilder.mockImplementationOnce(options => {
      options.consoleError('builder check');
      return jest.fn();
    });
    const globalFetch = jest.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = globalFetch;

    const initializeApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const getFirestoreInstance = jest.fn(() => ({ doc: jest.fn() }));
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ bucket: jest.fn() }));
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

    expect(createRenderVariant).not.toHaveBeenCalled();
    expect(globalFetch).not.toHaveBeenCalled();
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
    const getFirestoreInstance = jest.fn(() => ({ doc: jest.fn() }));
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ bucket: jest.fn() }));
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

    expect(createRenderVariant).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();

    globalThis.fetch = previousFetch;
  });

  test('forwards the cloud console error logger into the render builder', async () => {
    createRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

    const consoleError = jest.fn();
    const initializeApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const getFirestoreInstance = jest.fn(() => ({ doc: jest.fn() }));
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ bucket: jest.fn() }));
    const FieldValue = { delete: jest.fn(() => 'delete-sentinel') };
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const functions = { region };

    createRenderVariant.mockImplementationOnce(options =>
      jest.fn(async () => {
        options.consoleError('builder failure');
        return null;
      })
    );

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
      console: { error: consoleError },
    });

    await render('snap', 'context');

    expect(consoleError).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();

    globalThis.fetch = previousFetch;
  });
});
