import { describe, expect, it, jest } from '@jest/globals';
import { createBillingHttpHandler } from '../../../src/cloud/billing/http-handler.js';

describe('public billing offers HTTP boundary', () => {
  it('passes a fresh effect token to each response write', async () => {
    const handleOffers = jest.fn(async () => ({
      status: 200,
      body: { offers: [{ packageId: 'usd-10' }] },
    }));
    const sendResponse = jest.fn();
    const handle = createBillingHttpHandler(handleOffers, sendResponse);
    const response = {};

    await handle({ method: 'GET' }, response);
    await handle({ method: 'GET' }, response);

    expect(sendResponse.mock.calls[0][0]).not.toBe(
      sendResponse.mock.calls[1][0]
    );
    expect(handleOffers).toHaveBeenCalledTimes(2);
    expect(sendResponse.mock.calls[0][2]).toEqual({
      status: 200,
      body: { offers: [{ packageId: 'usd-10' }] },
      format: 'json',
    });
  });

  it('sends non-GET errors without invoking the offers handler', async () => {
    const handleOffers = jest.fn();
    const sendResponse = jest.fn();
    const handle = createBillingHttpHandler(handleOffers, sendResponse);
    const response = {};

    await handle({ method: 'POST' }, response);

    expect(handleOffers).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(expect.anything(), response, {
      status: 405,
      body: 'Method not allowed',
      format: 'text',
    });
  });

  it('routes POST refund requests through the authenticated handler', async () => {
    const handleOffers = jest.fn();
    const handleRefund = jest.fn(async () => ({
      status: 202,
      body: { refundIntentId: 'refund-1' },
    }));
    const sendResponse = jest.fn();
    const handle = createBillingHttpHandler(
      handleOffers,
      sendResponse,
      handleRefund
    );
    const response = {};

    await handle(
      {
        method: 'POST',
        body: { purchaseId: 'purchase-1' },
        headers: {
          authorization: 'Bearer token',
          'idempotency-key': 'retry-key-123',
        },
      },
      response
    );

    expect(handleRefund).toHaveBeenCalledWith(expect.anything(), {
      authorization: 'Bearer token',
      purchaseId: 'purchase-1',
      idempotencyKey: 'retry-key-123',
    });
    expect(sendResponse).toHaveBeenCalledWith(expect.anything(), response, {
      status: 202,
      body: { refundIntentId: 'refund-1' },
      format: 'json',
    });
    expect(handleOffers).not.toHaveBeenCalled();
  });
});
