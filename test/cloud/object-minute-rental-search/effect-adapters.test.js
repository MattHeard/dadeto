import { describe, expect, test, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createSearchHttpResponseEffectAdapters } from '../../../src/cloud/object-minute-rental-search/effect-adapters.js';

describe('object-minute rental search response effect adapters', () => {
  test('applies permission-first headers and JSON responses', () => {
    const allowEffects = createAllowEffects();
    const json = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { json, setHeader, status };
    const effects = createSearchHttpResponseEffectAdapters(response);

    effects.setHeader(allowEffects, 'Vary', 'Origin');
    effects.setStatus(allowEffects, 422);
    effects.sendJson(allowEffects, { valid: false });
    effects.sendJson(allowEffects, { valid: false }, 400);
    effects.sendJson(allowEffects, { valid: true, results: [] });

    expect(setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    expect(status.mock.calls).toEqual([[422], [400]]);
    expect(json.mock.calls).toEqual([
      [{ valid: false }],
      [{ valid: false }],
      [{ valid: true, results: [] }],
    ]);
  });

  test('omits a status write when response delivery uses the default status', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const effects = createSearchHttpResponseEffectAdapters({ json, status });

    effects.sendJson(createAllowEffects(), { valid: true });

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ valid: true });
  });
});
