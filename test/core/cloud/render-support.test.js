import { jest } from '@jest/globals';
import {
  createDynamicFetch,
  createMemoizedLoader,
  createCloudRenderContext,
  createRenderRuntime,
  createCloudRenderInstanceDeps,
  createCloudRenderInstanceBuilder,
  createCloudRenderEntrypointState,
} from '../../../src/core/cloud/render-support.js';

describe('render support helpers', () => {
  test('createDynamicFetch delegates to the injected fetch implementation', async () => {
    const fetchFn = jest.fn(async value => value);

    const dynamicFetch = createDynamicFetch(fetchFn);
    await expect(dynamicFetch('fallback')).resolves.toBe('fallback');

    expect(fetchFn).toHaveBeenCalledWith('fallback');
  });

  test('createMemoizedLoader only invokes the factory once', () => {
    const factory = jest.fn(() => ({ createdAt: Date.now() }));
    const resolveValue = createMemoizedLoader(factory);

    const first = resolveValue();
    const second = resolveValue();

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test('createRenderRuntime memoizes the instance and delegates fetch calls', async () => {
    const fetchFn = jest.fn(async value => `fallback:${value}`);
    const buildInstance = jest.fn(dynamicFetch => ({
      dynamicFetch,
    }));

    const runtime = createRenderRuntime(fetchFn, buildInstance);
    await expect(runtime.dynamicFetch('value')).resolves.toBe('fallback:value');

    const first = runtime.resolveInstance();
    const second = runtime.resolveInstance();

    expect(first).toBe(second);
    expect(buildInstance).toHaveBeenCalledTimes(1);
    expect(first.dynamicFetch).toBe(runtime.dynamicFetch);
  });

  test('createCloudRenderContext forwards the runtime environment to Firestore resolution', () => {
    const environmentVariables = {
      FIREBASE_CONFIG: JSON.stringify({ databaseId: 't-123' }),
      GOOGLE_CLOUD_PROJECT: 'proj',
      GCLOUD_PROJECT: 'fallback-proj',
      URL_MAP: 'map',
      CDN_HOST: 'cdn.example.com',
    };
    const getFirestoreInstance = jest.fn(() => ({ db: true }));
    const Storage = jest.fn(() => ({ storage: true }));
    const context = createCloudRenderContext({
      getEnvironmentVariables: jest.fn(() => environmentVariables),
      getFirestoreInstance,
      Storage,
      resolveBucketName: jest.fn(() => 'bucket'),
      resolveObjectPrefix: jest.fn(() => 'prefix'),
      defaultBucketName: 'default-bucket',
    });

    expect(getFirestoreInstance).toHaveBeenCalledWith({
      environment: environmentVariables,
    });
    expect(context.db).toEqual({ db: true });
    expect(context.bucketName).toBe('bucket');
    expect(context.objectPrefix).toBe('prefix');
  });

  test('builds renderer dependencies and forwards crypto and console hooks', () => {
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    const dynamicFetch = jest.fn();
    const consoleError = jest.fn();
    const deps = createCloudRenderInstanceDeps({
      db: { db: true },
      storage: { storage: true },
      dynamicFetch,
      crypto,
      projectId: 'project',
      urlMapName: 'map',
      cdnHost: 'cdn',
      bucketName: 'bucket',
      objectPrefix: 'prefix',
      consoleError,
    });
    expect(deps.fetchFn).toBe(dynamicFetch);
    expect(deps.randomUUID()).toBe('uuid');

    const renderer = jest.fn(options => options);
    const build = createCloudRenderInstanceBuilder({
      createRenderer: renderer,
      crypto,
      consoleError,
    });
    const state = {
      db: {},
      storage: {},
      dynamicFetch,
      projectId: undefined,
      urlMapName: undefined,
      cdnHost: undefined,
      bucketName: 'b',
      objectPrefix: 'p',
    };
    expect(build(state)).toMatchObject({ db: {}, bucketName: 'b' });
    expect(renderer).toHaveBeenCalledTimes(1);
  });

  test('creates and memoizes the full cloud render entrypoint state', () => {
    const ensureFirebaseApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const getEnvironmentVariables = jest.fn(() => ({
      GCLOUD_PROJECT: 'project',
      URL_MAP: 'map',
      CDN_HOST: 'cdn',
    }));
    const buildRender = jest.fn(state => state);
    const state = createCloudRenderEntrypointState({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance: jest.fn(() => ({ db: true })),
      Storage: jest.fn(() => ({ storage: true })),
      getEnvironmentVariables,
      fetchFn: jest.fn(),
      resolveBucketName: jest.fn(() => 'bucket'),
      resolveObjectPrefix: jest.fn(() => 'prefix'),
      defaultBucketName: 'default',
      buildRender,
    });

    expect(state.render()).toBe(state.render());
    expect(buildRender).toHaveBeenCalledTimes(1);
    expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  });
});
