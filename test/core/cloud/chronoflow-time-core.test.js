import { describe, expect, it, jest } from '@jest/globals';
import {
  createChronoflowTimeResponse,
  handleChronoflowTime,
} from '../../../src/core/cloud/chronoflow-time-core.js';

describe('Chronoflow time endpoint core', () => {
  const allowEffects =
    /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
  it('returns positive server epoch milliseconds with cache prevention headers', () => {
    const result = createChronoflowTimeResponse(() => 1_800_000_000_000);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ epochMs: 1_800_000_000_000 });
    expect(result.headers['Cache-Control']).toContain('no-store');
    expect(result.headers.Pragma).toBe('no-cache');
  });

  it('rejects invalid server epoch values', () => {
    for (const epoch of [0, -1, NaN, Infinity, 1.2]) {
      expect(() => createChronoflowTimeResponse(() => epoch)).toThrow(
        RangeError
      );
    }
  });

  it('allows only GET requests', () => {
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      send: jest.fn(() => response),
    };
    handleChronoflowTime(
      allowEffects,
      { method: 'POST' },
      response,
      () => 1_800_000_000_000
    );
    expect(response.status).toHaveBeenCalledWith(allowEffects, 405);
    expect(response.set).toHaveBeenCalledWith(allowEffects, 'Allow', 'GET');
    expect(response.send).toHaveBeenCalledWith(
      allowEffects,
      'Method not allowed'
    );
  });

  it('sets cache prevention and content type before returning JSON', () => {
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      json: jest.fn(() => response),
    };
    handleChronoflowTime(
      allowEffects,
      { method: 'GET' },
      response,
      () => 1_800_000_000_000
    );
    expect(response.set).toHaveBeenCalledWith(
      allowEffects,
      'Cache-Control',
      expect.stringContaining('no-store')
    );
    expect(response.set).toHaveBeenCalledWith(
      allowEffects,
      'Content-Type',
      'application/json; charset=utf-8'
    );
    expect(response.status).toHaveBeenCalledWith(allowEffects, 200);
    expect(response.json).toHaveBeenCalledWith(allowEffects, {
      epochMs: 1_800_000_000_000,
    });
  });

  it('answers cross-origin preflight without returning an epoch sample', () => {
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      send: jest.fn(() => response),
    };
    const epochClock = jest.fn(() => 1_800_000_000_000);
    handleChronoflowTime(
      allowEffects,
      { method: 'OPTIONS' },
      response,
      epochClock
    );
    expect(response.status).toHaveBeenCalledWith(allowEffects, 204);
    expect(response.set).toHaveBeenCalledWith(
      allowEffects,
      'Access-Control-Allow-Origin',
      '*'
    );
    expect(response.send).toHaveBeenCalledWith(allowEffects, '');
    expect(epochClock).not.toHaveBeenCalled();
  });
});
