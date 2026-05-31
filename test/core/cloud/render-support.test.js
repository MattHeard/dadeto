import { jest } from '@jest/globals';
import {
  createDynamicFetch,
  createMemoizedLoader,
  createRenderRuntime,
} from '../../../src/core/cloud/render-support.js';

describe('render support helpers', () => {
  test('createDynamicFetch falls back to the injected fetch implementation', async () => {
    const originalFetch = globalThis.fetch;
    const fetchFn = jest.fn(async value => value);

    try {
      globalThis.fetch = undefined;

      const dynamicFetch = createDynamicFetch(fetchFn);
      await expect(dynamicFetch('fallback')).resolves.toBe('fallback');
    } finally {
      globalThis.fetch = originalFetch;
    }

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
    const originalFetch = globalThis.fetch;
    const fetchFn = jest.fn(async value => `fallback:${value}`);
    const buildInstance = jest.fn(dynamicFetch => ({
      dynamicFetch,
    }));

    try {
      globalThis.fetch = undefined;

      const runtime = createRenderRuntime(fetchFn, buildInstance);
      await expect(runtime.dynamicFetch('value')).resolves.toBe(
        'fallback:value'
      );

      const first = runtime.resolveInstance();
      const second = runtime.resolveInstance();

      expect(first).toBe(second);
      expect(buildInstance).toHaveBeenCalledTimes(1);
      expect(first.dynamicFetch).toBe(runtime.dynamicFetch);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
