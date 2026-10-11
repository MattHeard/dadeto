import { describe, expect, it, jest } from '@jest/globals';
import { createPurchaseStatusHttpHandler } from '../../../src/cloud/billing-purchase-status/http-handler.js';

describe('purchase status HTTP boundary', () => {
  it('mints a fresh response permission on every request', async () => {
    const handleStatus = jest.fn(async () => ({
      status: 200,
      body: { status: 'paid' },
    }));
    const sendResponse = jest.fn();
    const handle = createPurchaseStatusHttpHandler(handleStatus, sendResponse);
    const response = {};

    await handle(
      {
        method: 'GET',
        query: { ['session_id']: 'cs-1' },
        headers: { authorization: 'Bearer token' },
      },
      response
    );
    await handle(
      { method: 'GET', query: { ['session_id']: 'cs-2' } },
      response
    );

    const firstPermission = sendResponse.mock.calls[0][0];
    const secondPermission = sendResponse.mock.calls[1][0];
    expect(firstPermission).not.toBe(secondPermission);
    expect(handleStatus).toHaveBeenNthCalledWith(1, {
      sessionId: 'cs-1',
      authorization: 'Bearer token',
    });
    expect(sendResponse.mock.calls[0][2]).toEqual({
      status: 200,
      body: { status: 'paid' },
      format: 'json',
    });
  });

  it('returns non-GET method errors through the response effect', async () => {
    const handleStatus = jest.fn();
    const sendResponse = jest.fn();
    const handle = createPurchaseStatusHttpHandler(handleStatus, sendResponse);

    await handle({ method: 'POST' }, {});

    expect(handleStatus).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(
      expect.anything(),
      {},
      { status: 405, body: 'Method not allowed', format: 'text' }
    );
  });
});
