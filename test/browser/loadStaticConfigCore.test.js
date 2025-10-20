import { describe, it, expect, jest } from '@jest/globals';
import { parseStaticConfigResponse } from '../../src/core/browser/load-static-config-core.js';

describe('parseStaticConfigResponse', () => {
  it('resolves with parsed json when response is ok', async () => {
    const payload = { featureFlag: true };
    const json = jest.fn().mockResolvedValue(payload);
    const response = { ok: true, json };

    await expect(parseStaticConfigResponse(response)).resolves.toBe(payload);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('throws an error when response is not ok', async () => {
    const json = jest.fn();
    const response = { ok: false, status: 503, json };

    await expect(parseStaticConfigResponse(response)).rejects.toThrow(
      'Failed to load static config: 503'
    );
    expect(json).not.toHaveBeenCalled();
  });
});
