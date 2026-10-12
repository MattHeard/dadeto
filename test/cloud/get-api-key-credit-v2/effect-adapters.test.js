import { describe, expect, it, jest } from '@jest/globals';
import { createGetApiKeyCreditV2EffectAdapters } from '../../../src/cloud/get-api-key-credit-v2/effect-adapters.js';
import { initializeFirebaseApp } from '../../../src/cloud/get-api-key-credit-v2/startup-effect-adapter.js';

describe('API key credit v2 effect adapters', () => {
  it('initializes Firebase through the startup capability adapter', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        Object.freeze({})
      );
    const initializer = jest.fn(() => ({ app: true }));

    expect(initializeFirebaseApp(allowEffects, initializer)).toEqual({
      app: true,
    });
    expect(initializer).toHaveBeenCalledTimes(1);
  });

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
    const reference = {};

    await expect(
      adapters.runTransaction(allowEffects, updateFunction)
    ).resolves.toBe('committed');
    await adapters.getTransactionDocument(transaction, reference);
    adapters.setTransactionDocument(allowEffects, transaction, reference, {
      credit: 2,
    });
    adapters.setResponseHeader(allowEffects, response, 'Allow', 'GET, POST');
    adapters.sendHttpResponse(
      allowEffects,
      response,
      201,
      { ok: true },
      'json'
    );

    expect(db.runTransaction).toHaveBeenCalledWith(updateFunction);
    expect(transaction.get).toHaveBeenCalledWith(reference);
    expect(transaction.set).toHaveBeenCalledWith(reference, { credit: 2 });
    expect(response.set).toHaveBeenCalledWith('Allow', 'GET, POST');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });
});
