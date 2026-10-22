import { describe, expect, it, jest } from '@jest/globals';
import { createGetAuthorUuidV2EffectAdapters } from '../../../src/cloud/get-author-uuid-v2/effect-adapters.js';

describe('author UUID effect adapters', () => {
  it('reads the author UUID and the caller owned billing identity with permission', async () => {
    const allowEffects = Object.freeze({});
    const authorSnapshot = { data: jest.fn(() => ({ uuid: 'author-id' })) };
    const ownershipSnapshot = {
      data: jest.fn(() => ({ apiKeyUuid: 'api-key-id' })),
    };
    const authorReference = {
      get: jest.fn().mockResolvedValue(authorSnapshot),
    };
    const ownershipReference = {
      get: jest.fn().mockResolvedValue(ownershipSnapshot),
    };
    const db = {
      collection: jest.fn(name => ({
        doc: jest.fn(() =>
          name === 'authors' ? authorReference : ownershipReference
        ),
      })),
    };
    const adapters = createGetAuthorUuidV2EffectAdapters({ db });

    await expect(
      adapters.getAuthorDocument(allowEffects, authorReference)
    ).resolves.toBe(authorSnapshot);
    await expect(
      adapters.resolveBillingIdentity(allowEffects, 'user-id')
    ).resolves.toBe('api-key-id');
    expect(authorReference.get).toHaveBeenCalledTimes(1);
    expect(db.collection).toHaveBeenCalledWith('api-key-ownership');
    expect(ownershipReference.get).toHaveBeenCalledTimes(1);
  });

  it('writes a merged UUID document and sends the HTTP response', async () => {
    const allowEffects = Object.freeze({});
    const reference = { set: jest.fn().mockResolvedValue() };
    const response = { status: jest.fn(() => ({ json: jest.fn() })) };
    const adapters = createGetAuthorUuidV2EffectAdapters();

    await adapters.setAuthorDocument(
      allowEffects,
      reference,
      { uuid: 'author-id' },
      { merge: true }
    );
    adapters.sendJsonResponse(allowEffects, response, 200, {
      uuid: 'author-id',
    });

    expect(reference.set).toHaveBeenCalledWith(
      { uuid: 'author-id' },
      { merge: true }
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
