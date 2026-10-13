import { describe, expect, jest, test } from '@jest/globals';

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
let registeredTriggerHandler;
const mockRegisterVariantWriteTrigger = jest.fn((permission, options) => {
  registeredTriggerHandler = options.handler;
  return jest.fn(() => 'renderVariant');
});
const region = jest.fn(() => ({
  firestore: {
    document: jest.fn(() => ({
      onWrite,
    })),
  },
}));

await jest.unstable_mockModule(
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

await jest.unstable_mockModule(
  '../../../../src/core/cloud/render-support.js',
  () => ({
    createCloudRenderInstanceBuilder: mockCreateCloudRenderInstanceBuilder,
    createCloudRenderEntrypointState: mockCreateCloudRenderEntrypointState,
    createCloudRenderEntrypointStateWithDb:
      mockCreateCloudRenderEntrypointState,
    createMemoizedLoader: jest.fn(),
  })
);

const { runRenderVariant } = await import(
  '../../../../src/core/cloud/render-variant/run.js'
);

const executeRunRenderVariant = dependencies =>
  runRenderVariant({
    ...dependencies,
    updateFirestoreDocument:
      dependencies.updateFirestoreDocument ?? jest.fn(async () => undefined),
    logError: dependencies.logError ?? jest.fn(),
    setFirestoreDocument:
      dependencies.setFirestoreDocument ?? jest.fn(async () => undefined),
    saveStorageFile:
      dependencies.saveStorageFile ?? jest.fn(async () => undefined),
  });

describe('runRenderVariant', () => {
  test('wires the cloud entrypoint and uses the global fetch path', async () => {
    mockCreateRenderVariant.mockClear();
    importedFetchFn.mockClear();
    const globalFetch = jest.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = globalFetch;

    const db = { doc: jest.fn() };
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ bucket: jest.fn() }));
    const FieldValue = { delete: jest.fn(() => 'delete-sentinel') };
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const functions = { region };
    const triggerPermission = Object.freeze({});
    const startupPermission = Object.freeze({ startup: true });
    const loggerPermission = Object.freeze({ invocation: 'logger' });
    const logError = jest.fn();
    let boundaryCalls = 0;
    const updateFirestoreDocument = jest.fn(async () => undefined);

    let capturedWriteOptions;
    let capturedBuilderOptions;
    const writeHandler = jest.fn();
    mockCreateHandleVariantWrite.mockImplementationOnce(options => {
      capturedWriteOptions = options;
      return writeHandler;
    });
    mockCreateCloudRenderInstanceBuilder.mockImplementationOnce(options => {
      capturedBuilderOptions = options;
      return jest.fn();
    });

    const { render } = executeRunRenderVariant({
      db,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      bindEffectBoundary: handler =>
        handler(boundaryCalls++ === 0 ? triggerPermission : loggerPermission),
      updateFirestoreDocument,
      effectFetchFn: jest.fn(),
      registerVariantWriteTrigger: mockRegisterVariantWriteTrigger,
      startupAllowEffects: startupPermission,
      crypto,
      logError,
    });

    expect(render('snap', 'context')).toBe('rendered');

    expect(mockCreateRenderVariant).not.toHaveBeenCalled();
    expect(globalFetch).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();
    await expect(capturedWriteOptions.renderVariant('snap')).resolves.toBe(
      'rendered'
    );
    expect(capturedWriteOptions.getDeleteSentinel()).toBe('delete-sentinel');
    await registeredTriggerHandler('change');
    expect(writeHandler).toHaveBeenCalledWith(triggerPermission, 'change');
    expect(capturedWriteOptions.updateDocument).toBe(updateFirestoreDocument);
    const rendererDependencies = { fetchFn: importedFetchFn };
    capturedBuilderOptions.createRenderer(rendererDependencies);
    expect(mockCreateRenderVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        ...rendererDependencies,
        bindEffectBoundary: expect.any(Function),
        updateFirestoreDocument: expect.any(Function),
        setFirestoreDocument: expect.any(Function),
        saveStorageFile: expect.any(Function),
        effectFetchFn: expect.any(Function),
      })
    );
    capturedBuilderOptions.consoleError('builder failure');
    expect(logError).toHaveBeenCalledWith(loggerPermission, 'builder failure');
    expect(boundaryCalls).toBe(2);
    expect(logError).not.toHaveBeenCalledWith(
      startupPermission,
      expect.anything()
    );
    expect(mockCreateCloudRenderInstanceBuilder).toHaveBeenCalled();
    expect(mockCreateCloudRenderInstanceBuilder.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ createRenderer: expect.any(Function) })
    );
    expect(mockCreateCloudRenderEntrypointState.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        entrypointKind: 'variant',
        defaultBucketName: 'bucket',
      })
    );
    expect(mockRegisterVariantWriteTrigger).toHaveBeenCalledWith(
      startupPermission,
      expect.objectContaining({
        region: 'europe-west1',
        documentPath: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
      })
    );
  });

  test('falls back to the imported fetch helper when global fetch is missing', async () => {
    mockCreateRenderVariant.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

    const db = { doc: jest.fn() };
    const getEnvironmentVariables = jest.fn(() => ({
      GOOGLE_CLOUD_PROJECT: 'proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    }));
    const Storage = jest.fn(() => ({ bucket: jest.fn() }));
    const FieldValue = { delete: jest.fn(() => 'delete-sentinel') };
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const functions = { region };

    const { render } = executeRunRenderVariant({
      db,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      registerVariantWriteTrigger: mockRegisterVariantWriteTrigger,
      startupAllowEffects: Object.freeze({}),
      crypto,
    });
    await render('snap', 'context');

    expect(mockCreateRenderVariant).not.toHaveBeenCalled();
    expect(importedFetchFn).not.toHaveBeenCalled();

    globalThis.fetch = previousFetch;
  });

  test('does not log during startup before a render reports an error', async () => {
    mockCreateRenderVariant.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

    const db = { doc: jest.fn() };
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

    const { render } = executeRunRenderVariant({
      db,
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
      registerVariantWriteTrigger: mockRegisterVariantWriteTrigger,
      startupAllowEffects: Object.freeze({}),
      logError: jest.fn(),
    });

    await render('snap', 'context');

    expect(importedFetchFn).not.toHaveBeenCalled();

    globalThis.fetch = previousFetch;
  });

  test('does not use global console during render setup', async () => {
    mockCreateRenderVariant.mockClear();
    importedFetchFn.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

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

    executeRunRenderVariant({
      db: { doc: jest.fn() },
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
      registerVariantWriteTrigger: mockRegisterVariantWriteTrigger,
      startupAllowEffects: Object.freeze({}),
    });

    globalThis.fetch = previousFetch;
  });

  test('wires the onWrite trigger through the wrapper handler', async () => {
    mockCreateRenderVariant.mockClear();
    mockRegisterVariantWriteTrigger.mockClear();
    const previousFetch = globalThis.fetch;
    delete globalThis.fetch;

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

    const { renderVariant } = executeRunRenderVariant({
      db: { doc: jest.fn() },
      getEnvironmentVariables,
      functions,
      FieldValue,
      Storage,
      fetchFn: importedFetchFn,
      crypto,
      registerVariantWriteTrigger: mockRegisterVariantWriteTrigger,
      startupAllowEffects: Object.freeze({}),
      console: { error: jest.fn() },
    });

    expect(renderVariant).toBeDefined();

    globalThis.fetch = previousFetch;
  });
});
