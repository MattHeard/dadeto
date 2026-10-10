import { describe, expect, it, jest } from '@jest/globals';
import { createGetAuthorUuidV2EffectAdapters } from '../../../src/cloud/get-author-uuid-v2/effect-adapters.js';

describe('author UUID effect adapters', () => {
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
