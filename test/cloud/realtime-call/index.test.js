import { describe, expect, it, jest } from '@jest/globals';

describe('realtime-call cloud entry point', () => {
  it('mints a fresh permission for each injected fetch', async () => {
    const usedPermissions = [];
    const fetchedRequests = [];
    const rawFetch = jest.fn(async (...args) => {
      fetchedRequests.push(args);
      return { ok: true };
    });
    const app = { use: jest.fn(), post: jest.fn() };
    const expressImpl = Object.assign(
      jest.fn(() => app),
      { text: jest.fn(() => ({ bodyParser: true })) }
    );
    const corsImpl = jest.fn(() => ({ cors: true }));
    const onRequest = jest.fn((options, handler) => ({ options, handler }));
    const exchangeRealtimeCallSdpCore = jest.fn(async (body, options) => {
      await options.bindEffectBoundary(permission => {
        usedPermissions.push(permission);
        return options.fetchImpl(permission, 'https://api.example.test/calls', {
          method: 'POST',
        });
      });
      return { sdpAnswer: `answer for ${body}`, location: '' };
    });
    let mod;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = rawFetch;

    try {
      await jest.isolateModulesAsync(async () => {
        await jest.unstable_mockModule(
          '../../../src/cloud/realtime-call/realtime-call-v2-gcf.js',
          () => ({
            onRequest,
            express: expressImpl,
            cors: corsImpl,
            getEnvironmentVariables: () => ({}),
          })
        );
        await jest.unstable_mockModule(
          '../../../src/cloud/cors-config.js',
          () => ({
            getAllowedOrigins: jest.fn(() => ['https://app.example.test']),
          })
        );
        await jest.unstable_mockModule(
          '../../../src/core/realtime/openaiRealtimeCalls.js',
          () => ({ exchangeRealtimeCallSdp: exchangeRealtimeCallSdpCore })
        );
        mod = await import('../../../src/cloud/realtime-call/index.js');
      });

      const requestHandler = app.post.mock.calls[0][1];
      for (const body of ['offer-1', 'offer-2']) {
        await requestHandler(
          { body },
          { type: jest.fn().mockReturnThis(), send: jest.fn() },
          jest.fn()
        );
      }

      expect(onRequest).toHaveBeenCalledWith(
        { region: 'europe-west1' },
        mod.realtimeCallApp
      );
      expect(exchangeRealtimeCallSdpCore).toHaveBeenCalledTimes(2);
      expect(usedPermissions).toHaveLength(2);
      expect(usedPermissions[0]).not.toBe(usedPermissions[1]);
      expect(usedPermissions.every(Object.isFrozen)).toBe(true);
      expect(fetchedRequests).toEqual([
        ['https://api.example.test/calls', { method: 'POST' }],
        ['https://api.example.test/calls', { method: 'POST' }],
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
