import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { sendPublicBillingOffersResponse } from '../../../src/cloud/billing/effect-adapters.js';

describe('public billing offers response adapter', () => {
  it('sends JSON results with the requested status', () => {
    const json = jest.fn();
    const response = { status: jest.fn(() => ({ json, send: jest.fn() })) };

    sendPublicBillingOffersResponse(createAllowEffects(), response, {
      status: 200,
      body: { offers: [] },
      format: 'json',
    });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ offers: [] });
  });

  it('sends method errors as text', () => {
    const send = jest.fn();
    const response = { status: jest.fn(() => ({ json: jest.fn(), send })) };

    sendPublicBillingOffersResponse(createAllowEffects(), response, {
      status: 405,
      body: 'Method not allowed',
      format: 'text',
    });

    expect(response.status).toHaveBeenCalledWith(405);
    expect(send).toHaveBeenCalledWith('Method not allowed');
  });
});
