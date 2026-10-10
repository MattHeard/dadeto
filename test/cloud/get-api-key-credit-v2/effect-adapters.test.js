import { describe, expect, it, jest } from '@jest/globals';
import { createGetApiKeyCreditV2EffectAdapters } from '../../../src/cloud/get-api-key-credit-v2/effect-adapters.js';

describe('API key credit v2 effect adapters', () => {
  it('forwards the capability to transaction and response operations', async () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        Object.freeze({})
      );
    const transaction = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      set: jest.fn(),
    };
    const db = {
      runTransaction: jest.fn(async callback => callback(transaction)),
    };
    const response = {
      set: jest.fn(),
      status: jest.fn(() => response),
      json: jest.fn(),
      send: jest.fn(),
    };
    const adapters = createGetApiKeyCreditV2EffectAdapters(db);
    const updateFunction = jest.fn(async () => 'committed');

    await expect(
      adapters.runTransaction(allowEffects, updateFunction)
    ).resolves.toBe('committed');
    await adapters.getTransactionDocument(allowEffects, transaction, {});
    adapters.setTransactionDocument(
      allowEffects,
      transaction,
      {},
      { credit: 2 }
    );
    adapters.setResponseHeader(allowEffects, response, 'Allow', 'GET, POST');
    adapters.sendHttpResponse(
      allowEffects,
      response,
      201,
      { ok: true },
      'json'
    );

    expect(db.runTransaction).toHaveBeenCalledWith(updateFunction);
    expect(transaction.get).toHaveBeenCalled();
    expect(transaction.set).toHaveBeenCalledWith({}, { credit: 2 });
    expect(response.set).toHaveBeenCalledWith('Allow', 'GET, POST');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });
});
