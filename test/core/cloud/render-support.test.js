import { jest } from '@jest/globals';
import {
  createDynamicFetch,
  createMemoizedLoader,
  createCloudRenderContext,
  createRenderRuntime,
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
});
