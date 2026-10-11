import { describe, expect, it, jest } from '@jest/globals';
import { createPublicBillingOffersHttpHandler } from '../../../src/cloud/billing/http-handler.js';

describe('public billing offers HTTP boundary', () => {
  it('passes a fresh effect token to each response write', async () => {
    const handleOffers = jest.fn(async () => ({
      status: 200,
      body: { offers: [{ packageId: 'usd-10' }] },
    }));
    const sendResponse = jest.fn();
    const handle = createPublicBillingOffersHttpHandler(
      handleOffers,
      sendResponse
    );
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
    const handle = createPublicBillingOffersHttpHandler(
      handleOffers,
      sendResponse
    );
    const response = {};

    await handle({ method: 'POST' }, response);

    expect(handleOffers).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(expect.anything(), response, {
      status: 405,
      body: 'Method not allowed',
      format: 'text',
    });
  });
});
