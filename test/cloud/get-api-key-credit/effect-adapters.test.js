import { describe, expect, it, jest } from '@jest/globals';
import { createGetApiKeyCreditEffectAdapters } from '../../../src/cloud/get-api-key-credit/effect-adapters.js';

describe('API key credit effect adapters', () => {
  it('forwards permission to response headers and response sends', () => {
    const allowEffects = Object.freeze({});
    const response = {
      set: jest.fn(),
      status: jest.fn(() => response),
      send: jest.fn(),
      json: jest.fn(),
    };
    const adapters = createGetApiKeyCreditEffectAdapters();

    adapters.setResponseHeader(allowEffects, response, 'Allow', 'POST');
    adapters.sendHttpResponse(
      allowEffects,
      response,
      400,
      'Missing UUID',
      'send'
    );

    expect(response.set).toHaveBeenCalledWith('Allow', 'POST');
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.send).toHaveBeenCalledWith('Missing UUID');
  });
});
