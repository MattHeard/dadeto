import { describe, expect, it, jest } from '@jest/globals';
import {
  createChronoflowTimeResponse,
  handleChronoflowTime,
} from '../../../src/core/cloud/chronoflow-time-core.js';

describe('Chronoflow time endpoint core', () => {
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
    handleChronoflowTime({ method: 'POST' }, response, () => 1_800_000_000_000);
    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.set).toHaveBeenCalledWith('Allow', 'GET');
    expect(response.send).toHaveBeenCalledWith('Method not allowed');
  });

  it('sets cache prevention and content type before returning JSON', () => {
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      json: jest.fn(() => response),
    };
    handleChronoflowTime({ method: 'GET' }, response, () => 1_800_000_000_000);
    expect(response.set).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('no-store')
    );
    expect(response.set).toHaveBeenCalledWith(
      'Content-Type',
      'application/json; charset=utf-8'
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ epochMs: 1_800_000_000_000 });
  });

  it('answers cross-origin preflight without returning an epoch sample', () => {
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      send: jest.fn(() => response),
    };
    const epochClock = jest.fn(() => 1_800_000_000_000);
    handleChronoflowTime({ method: 'OPTIONS' }, response, epochClock);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      '*'
    );
    expect(response.send).toHaveBeenCalledWith('');
    expect(epochClock).not.toHaveBeenCalled();
  });
});
