import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { sendPurchaseStatusResponse } from '../../../src/cloud/billing-purchase-status/effect-adapters.js';

describe('purchase status response adapter', () => {
  it('requires permission and sends JSON status results', () => {
    const permission = createAllowEffects();
    const json = jest.fn();
    const response = { status: jest.fn(() => ({ json, send: jest.fn() })) };

    sendPurchaseStatusResponse(permission, response, {
      status: 200,
      body: { status: 'paid' },
      format: 'json',
    });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ status: 'paid' });
  });

  it('sends text responses through the same permission-aware adapter', () => {
    const send = jest.fn();
    const response = { status: jest.fn(() => ({ json: jest.fn(), send })) };

    sendPurchaseStatusResponse(createAllowEffects(), response, {
      status: 405,
      body: 'Method not allowed',
      format: 'text',
    });

    expect(response.status).toHaveBeenCalledWith(405);
    expect(send).toHaveBeenCalledWith('Method not allowed');
  });
});
