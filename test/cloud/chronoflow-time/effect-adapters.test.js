import { describe, expect, it, jest } from '@jest/globals';
import { createChronoflowHttpResponseAdapter } from '../../../src/cloud/chronoflow-time/effect-adapters.js';

describe('Chronoflow HTTP response adapter', () => {
  it('requires a capability and delegates all response writes', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const response = {
      status: jest.fn(() => response),
      set: jest.fn(() => response),
      json: jest.fn(() => response),
      send: jest.fn(() => response),
    };
    const adapter = createChronoflowHttpResponseAdapter(response);

    expect(adapter.status(allowEffects, 200)).toBe(adapter);
    expect(adapter.set(allowEffects, 'Cache-Control', 'no-store')).toBe(
      adapter
    );
    expect(adapter.json(allowEffects, { epochMs: 123 })).toBe(response);
    expect(adapter.send(allowEffects, 'done')).toBe(response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.json).toHaveBeenCalledWith({ epochMs: 123 });
    expect(response.send).toHaveBeenCalledWith('done');
  });
});
