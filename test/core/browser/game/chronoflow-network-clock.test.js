import { describe, expect, it, jest } from '@jest/globals';
import {
  estimateNetworkClock,
  readNetworkClock,
  sampleNetworkClock,
} from '../../../../src/core/browser/game/chronoflow/networkClock.js';

const permission = Object.freeze({});
const sample = options =>
  sampleNetworkClock({
    ...options,
    fetchImpl: (_permission, ...args) => options.fetchImpl(...args),
    bindEffectBoundary: handler => handler(permission),
  });

describe('Chronoflow Internet clock adapter', () => {
  it('estimates server offset and uncertainty from a monotonic request bracket', () => {
    expect(
      estimateNetworkClock({
        serverEpochMs: 1_800_000_000_050,
        requestStartMs: 100,
        responseEndMs: 200,
      })
    ).toEqual({
      serverEpochMs: 1_800_000_000_050,
      offsetMs: 1_799_999_999_900,
      uncertaintyMs: 50,
      sampledAtMonotonicMs: 200,
    });
  });

  it('rejects malformed samples, reversed monotonic values, and excessive round trips', () => {
    for (const sample of [
      { serverEpochMs: NaN, requestStartMs: 0, responseEndMs: 1 },
      { serverEpochMs: 1, requestStartMs: -1, responseEndMs: 1 },
      { serverEpochMs: 1, requestStartMs: 2, responseEndMs: 1 },
      { serverEpochMs: 1, requestStartMs: 0, responseEndMs: 5001 },
    ]) {
      expect(() => estimateNetworkClock(sample)).toThrow(RangeError);
    }
  });

  it('advances from server time with monotonic elapsed time and becomes stale', () => {
    const sample = estimateNetworkClock({
      serverEpochMs: 1000,
      requestStartMs: 10,
      responseEndMs: 20,
    });
    expect(readNetworkClock(sample, 70)).toEqual({
      status: 'synchronized',
      epochMs: 1055,
      uncertaintyMs: 5,
    });
    expect(readNetworkClock(sample, 31, 10)).toEqual({
      status: 'stale',
      epochMs: null,
      uncertaintyMs: null,
    });
    expect(() => readNetworkClock(sample, 19)).toThrow(RangeError);
    expect(() => readNetworkClock(sample, 20, -1)).toThrow(RangeError);
  });

  it('samples an injected endpoint and monotonic source without wall-clock fallback', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ epochMs: 1_800_000_000_150 }),
    }));
    const samples = [100, 200];
    const monotonicNow = jest.fn(() => samples.shift());
    await expect(sample({ fetchImpl, monotonicNow })).resolves.toEqual({
      serverEpochMs: 1_800_000_000_150,
      offsetMs: 1_800_000_000_000,
      uncertaintyMs: 50,
      sampledAtMonotonicMs: 200,
    });
    expect(fetchImpl).toHaveBeenCalledWith('/api/time', { cache: 'no-store' });
  });

  it('forwards a fresh boundary permission to the injected clock transport', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ epochMs: 1_800_000_000_150 }),
    }));
    await sampleNetworkClock({
      fetchImpl,
      bindEffectBoundary: handler => handler(permission),
      monotonicNow: (() => {
        let now = 100;
        return () => (now += 50);
      })(),
    });
    expect(fetchImpl).toHaveBeenCalledWith(permission, '/api/time', {
      cache: 'no-store',
    });
  });

  it('rejects failed, invalid-shape, and non-object endpoint responses', async () => {
    const monotonicNow = (() => {
      let now = 0;
      return () => (now += 1);
    })();
    await expect(
      sample({
        monotonicNow,
        fetchImpl: async () => ({ ok: false, status: 503 }),
      })
    ).rejects.toThrow('HTTP 503');
    await expect(
      sample({
        monotonicNow,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => null,
        }),
      })
    ).rejects.toThrow(TypeError);
    await expect(
      sample({
        monotonicNow,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ epochMs: 'now' }),
        }),
      })
    ).rejects.toThrow(RangeError);
  });
});
