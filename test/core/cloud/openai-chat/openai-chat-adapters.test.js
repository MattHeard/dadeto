import { describe, expect, it, jest } from '@jest/globals';
import { createOpenAIChatFirestoreAdapters } from '../../../../src/cloud/openai-chat/firestore-adapters.js';
import { createOpenAIChatHttpAdapter } from '../../../../src/cloud/openai-chat/http-adapter.js';

const allowEffects = Object.freeze({ request: true });

/** @returns {{db: any, documents: Map<string, any>}} In-memory Firestore adapter. */
function createFirestore() {
  const documents = new Map();
  const keyFor = (collectionName, id) => `${collectionName}/${id}`;
  const reference = (collectionName, id) => {
    const key = keyFor(collectionName, id);
    return {
      get: async () => ({
        exists: documents.has(key),
        data: () => documents.get(key),
      }),
      set: async value => documents.set(key, value),
      write: value => documents.set(key, value),
    };
  };
  const db = {
    collection: name => ({ doc: id => reference(name, id) }),
    runTransaction: callback =>
      callback({
        get: target => target.get(),
        set: (target, value) => target.write(value),
      }),
  };
  return { db, documents };
}

/** @returns {Record<string, any>} Express-like response recorder. */
function response() {
  const result = { headers: {} };
  result.set = (name, value) => {
    result.headers[name] = value;
    return result;
  };
  result.status = status => {
    result.statusCode = status;
    return result;
  };
  result.json = body => {
    result.body = body;
    return result;
  };
  result.send = body => {
    result.body = body;
    return result;
  };
  return result;
}

describe('OpenAI chat Firestore adapters', () => {
  it('resolves identity, persists a bounded retry result, and limits hashed users transactionally', async () => {
    const { db, documents } = createFirestore();
    await db.collection('api-key-ownership').doc('user-1').set({
      apiKeyUuid: 'billing-1',
    });
    const adapters = createOpenAIChatFirestoreAdapters({
      db,
      hashId: value => `hashed-${value.length}-${value.charCodeAt(0)}`,
      now: () => 0,
    });
    await expect(
      adapters.resolveBillingIdentity(allowEffects, 'user-1')
    ).resolves.toBe('billing-1');
    await expect(
      adapters.resolveBillingIdentity(allowEffects, 'missing')
    ).resolves.toBeNull();

    const result = { requestHash: 'hash-1', reply: 'A response' };
    await adapters.saveResult(allowEffects, 'billing-1', 'attempt-1', result);
    await expect(
      adapters.readResult(allowEffects, 'billing-1', 'attempt-1')
    ).resolves.toEqual(result);
    const stored = [...documents.entries()].find(([key]) =>
      key.startsWith('openai-chat-results/')
    )?.[1];
    expect(stored.expiresAt).toEqual(new Date(86_400_000));

    const limits = [];
    for (let index = 0; index < 6; index += 1)
      limits.push(await adapters.limitRequest(allowEffects, 'user-1'));
    expect(limits.filter(item => item.allowed)).toHaveLength(5);
    expect(limits.at(-1)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(
      [...documents.keys()].some(
        key => key === 'openai-chat-rate-limits/user-1'
      )
    ).toBe(false);
  });

  it('treats malformed persisted chat results as absent', async () => {
    const { db } = createFirestore();
    await db.collection('openai-chat-results').doc('stored').set({ reply: 4 });
    const adapters = createOpenAIChatFirestoreAdapters({
      db,
      hashId: () => 'stored',
    });
    await expect(
      adapters.readResult(allowEffects, 'billing-1', 'attempt-1')
    ).resolves.toBeNull();
  });
});

describe('OpenAI chat HTTP adapter', () => {
  it('answers an allowed CORS preflight without invoking chat', async () => {
    const handleChat = jest.fn();
    const handle = createOpenAIChatHttpAdapter({
      handleChat,
      allowedOrigins: ['https://mattheard.net'],
    });
    const res = response();
    await handle(
      allowEffects,
      { method: 'OPTIONS', get: () => 'https://mattheard.net' },
      res
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers).toMatchObject({
      'Access-Control-Allow-Origin': 'https://mattheard.net',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, Idempotency-Key',
    });
    expect(handleChat).not.toHaveBeenCalled();
  });

  it('rejects unknown origins and methods and passes allowed requests through', async () => {
    const handleChat = jest.fn().mockResolvedValue({
      status: 200,
      body: { reply: 'A response' },
    });
    const handle = createOpenAIChatHttpAdapter({
      handleChat,
      allowedOrigins: ['https://mattheard.net'],
    });
    const forbidden = response();
    await handle(
      allowEffects,
      { method: 'POST', get: () => 'https://invalid.example' },
      forbidden
    );
    expect(forbidden.statusCode).toBe(403);
    expect(handleChat).not.toHaveBeenCalled();

    const unsupported = response();
    await handle(allowEffects, { method: 'GET' }, unsupported);
    expect(unsupported.statusCode).toBe(405);
    expect(handleChat).not.toHaveBeenCalled();

    const req = {
      method: 'POST',
      headers: { origin: 'https://mattheard.net' },
    };
    const accepted = response();
    await handle(allowEffects, req, accepted);
    expect(handleChat).toHaveBeenCalledWith(allowEffects, req);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.body).toEqual({ reply: 'A response' });
  });
});
