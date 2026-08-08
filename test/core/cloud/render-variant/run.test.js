import { describe, expect, jest, test } from '@jest/globals';

const ensureFirebaseApp = jest.fn();
const importedFetchFn = jest.fn(() => Promise.resolve({ ok: true }));
const onWrite = jest.fn(() => 'renderVariant');
const mockCreateRenderVariant = jest.fn(options =>
  jest.fn(async (...args) => {
    await options.fetchFn(...args);
    return null;
  })
);
const mockCreateHandleVariantWrite = jest.fn(() => jest.fn(() => 'handled'));
const mockCreateCloudRenderEntrypointState = jest.fn(() => ({
  db: { doc: jest.fn() },
  render: jest.fn(() => jest.fn(() => 'rendered')),
}));
const mockCreateCloudRenderInstanceBuilder = jest.fn(() => jest.fn());
const mockCreateFirestoreDocumentOnWriteTrigger = jest.fn(options => {
  options.handler('change');
  return jest.fn(() => 'renderVariant');
});
const region = jest.fn(() => ({
  firestore: {
    document: jest.fn(() => ({
      onWrite,
    })),
  },
}));

jest.mock(
  '../../../../src/core/cloud/render-variant/render-variant-core.js',
  () => ({
    DEFAULT_BUCKET_NAME: 'bucket',
    VISIBILITY_THRESHOLD: 1,
    buildAltsHtml: jest.fn(() => 'alts'),
    buildHtml: jest.fn(() => 'html'),
    getVisibleVariants: jest.fn(() => ['visible']),
    resolveStaticBucketName: jest.fn(() => 'resolved-bucket'),
    resolveStaticObjectPrefix: jest.fn(() => 'prefix'),
    createHandleVariantWrite: mockCreateHandleVariantWrite,
    createRenderVariant: mockCreateRenderVariant,
  })
);

jest.mock(
  '../../../../src/core/cloud/render-support.js',
  () => ({
    createCloudRenderInstanceBuilder: mockCreateCloudRenderInstanceBuilder,
    createCloudRenderEntrypointState: mockCreateCloudRenderEntrypointState,
    createMemoizedLoader: jest.fn(),
  })
);

jest.mock('../../../../src/core/cloud/cloud-core.js', () => ({
  createFirestoreDocumentOnWriteTrigger: mockCreateFirestoreDocumentOnWriteTrigger,
}));

let runRenderVariant;

beforeAll(async () => {
  ({ runRenderVariant } = await import(
    '../../../../src/core/cloud/render-variant/run.js'
  ));
});

describe('runRenderVariant', () => {
  test('wires the cloud entrypoint and uses the global fetch path', async () => {
    mockCreateRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    mockCreateCloudRenderInstanceBuilder.mockImplementationOnce(options => {
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

    expect(mockCreateRenderVariant).not.toHaveBeenCalled();
    expect(globalFetch).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();
  });

  test('falls back to the imported fetch helper when global fetch is missing', async () => {
    mockCreateRenderVariant.mockClear();
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

    expect(mockCreateRenderVariant).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();

    globalThis.fetch = previousFetch;
  });

  test('forwards the cloud console error logger into the render builder', async () => {
    mockCreateRenderVariant.mockClear();
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

    mockCreateRenderVariant.mockImplementationOnce(options =>
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

  test('uses the global console when one is not provided', async () => {
    mockCreateRenderVariant.mockClear();
    ensureFirebaseApp.mockClear();
    onWrite.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

    const consoleError = jest.fn();
    const previousConsoleError = globalThis.console.error;
    globalThis.console.error = consoleError;

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

    mockCreateRenderVariant.mockImplementationOnce(options =>
      jest.fn(async () => {
        options.consoleError('builder failure');
        return null;
      })
    );

    runRenderVariant({
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

    expect(consoleError).not.toHaveBeenCalled();

    globalThis.console.error = previousConsoleError;
    globalThis.fetch = previousFetch;
  });

  test('wires the onWrite trigger through the wrapper handler', async () => {
    mockCreateRenderVariant.mockClear();
    mockCreateFirestoreDocumentOnWriteTrigger.mockClear();
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
    mockCreateRenderVariant.mockImplementationOnce(options =>
      jest.fn(async snap => {
        await options.fetchFn(snap);
        return null;
      })
    );
    mockCreateHandleVariantWrite.mockImplementationOnce(options => {
      options.getDeleteSentinel();
      options.renderVariant('snap');
      return jest.fn(() => 'handled');
    });

    const { renderVariant } = runRenderVariant({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
      console: { error: jest.fn() },
    });

    expect(renderVariant).toBeDefined();

    globalThis.fetch = previousFetch;
  });
});
