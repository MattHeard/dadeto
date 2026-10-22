import { describe, expect, it, jest } from '@jest/globals';
import {
  createGetAuthorUuidV2ExpressHandle,
  createGetAuthorUuidV2Handler as createCoreHandler,
} from '../../../../src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js';

const authorizationHeader = name => {
  if (name === 'authorization') return 'Bearer token';
  return null;
};
const allowEffects = Object.freeze({});
const setAuthorDocument = (permission, reference, data, options) =>
  reference.set(data, options);

/**
 * @returns {object} Firestore double with mocked collection access.
 */
function createDb() {
  const set = jest.fn().mockResolvedValue();
  const get = jest.fn();
  const doc = jest.fn(() => ({
    get,
    set,
  }));
  const collection = jest.fn(() => ({ doc }));
  return {
    set,
    get,
    collection,
    doc,
  };
}

/**
 * Map fixture inputs to the grouped handler dependencies.
 * @param {Record<string, any>} deps Test fixture.
 * @returns {Function} Configured core handler.
 */
function createGetAuthorUuidV2Handler(deps) {
  return createCoreHandler({
    db: deps.db,
    auth: deps.auth,
    persistence: {
      randomUUID: deps.randomUUID,
      getAuthorDocument: deps.getAuthorDocument,
      setAuthorDocument: deps.setAuthorDocument,
    },
    billing: deps.billingEnabled
      ? {
          enabled: true,
          resolveBillingIdentity: deps.resolveBillingIdentity,
          service: deps.billing,
        }
      : undefined,
  });
}

describe('createGetAuthorUuidV2Handler', () => {
  it('returns the cached author uuid when one exists', async () => {
    const db = createDb();
    db.collection()
      .doc()
      .get.mockResolvedValue({
        data: () => ({ uuid: 'author-uuid' }),
      });
    const handler = createGetAuthorUuidV2Handler({
      db,
      auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
    });

    await expect(
      handler(allowEffects, {
        get: authorizationHeader,
      })
    ).resolves.toEqual({ status: 200, body: { uuid: 'author-uuid' } });
    expect(db.collection).toHaveBeenCalledWith('authors');
    expect(db.doc).toHaveBeenCalledWith('user-1');
  });

  it('creates an author uuid when one is missing', async () => {
    const set = jest.fn().mockResolvedValue();
    const setAuthorDocument = jest.fn((permission, reference, data, options) =>
      reference.set(data, options)
    );
    const get = jest.fn().mockResolvedValue({ data: () => undefined });
    const doc = { get, set };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => doc) })),
    };
    const handler = createGetAuthorUuidV2Handler({
      db,
      auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
      randomUUID: jest.fn().mockReturnValue('uuid-1'),
      setAuthorDocument,
    });

    await expect(
      handler(allowEffects, {
        get: authorizationHeader,
      })
    ).resolves.toEqual({ status: 200, body: { uuid: 'uuid-1' } });
    expect(set).toHaveBeenCalledWith({ uuid: 'uuid-1' }, { merge: true });
    expect(setAuthorDocument).toHaveBeenCalledWith(
      allowEffects,
      doc,
      { uuid: 'uuid-1' },
      { merge: true }
    );
  });

  it('routes enabled billing through the billable operation handler', async () => {
    const db = createDb();
    db.get.mockResolvedValue({ data: () => undefined });
    const billing = {
      getCurrentPricingSnapshot: jest
        .fn()
        .mockResolvedValue({ snapshotId: 'price-1' }),
      reserveOperation: jest.fn().mockResolvedValue({
        status: 200,
        body: { status: 'reserved', applied: true },
      }),
      resolveOperation: jest.fn().mockResolvedValue({
        status: 200,
        body: { status: 'settled' },
      }),
    };
    const handler = createGetAuthorUuidV2Handler({
      db,
      auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
      randomUUID: jest.fn().mockReturnValue('author-uuid-1'),
      setAuthorDocument: jest.fn().mockResolvedValue(),
      billingEnabled: true,
      billing,
      resolveBillingIdentity: jest.fn().mockResolvedValue('api-key-1'),
    });

    await expect(
      handler(allowEffects, {
        get: name =>
          name === 'authorization'
            ? 'Bearer token'
            : name === 'idempotency-key'
              ? 'retry-1'
              : null,
      })
    ).resolves.toEqual({ status: 200, body: { uuid: 'author-uuid-1' } });
    expect(billing.reserveOperation).toHaveBeenCalledTimes(1);
    expect(billing.resolveOperation).toHaveBeenCalledTimes(1);
  });

  it('rejects missing or invalid tokens', async () => {
    const handler = createGetAuthorUuidV2Handler({
      db: {
        collection: jest.fn(),
      },
      auth: { verifyIdToken: jest.fn() },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
    });

    await expect(handler(allowEffects, {})).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
  });

  it('accepts an omitted request object', async () => {
    const handler = createGetAuthorUuidV2Handler({
      db: {
        collection: jest.fn(),
      },
      auth: { verifyIdToken: jest.fn() },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
    });

    await expect(handler(allowEffects)).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
  });

  it('writes the handler result to an express response', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const sendJsonResponse = jest.fn((permission, response, code, body) =>
      response.status(code).json(body)
    );
    const setResponseHeader = jest.fn();
    const sendEmptyResponse = jest.fn();
    const handle = createGetAuthorUuidV2ExpressHandle({
      db: {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              data: () => ({ uuid: 'author-uuid' }),
            }),
            set: jest.fn(),
          })),
        })),
      },
      auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
      randomUUID: jest.fn(),
      setAuthorDocument,
      sendJsonResponse,
      setResponseHeader,
      sendEmptyResponse,
      allowedOrigins: ['https://mattheard.net'],
    });
    const response = { status };

    await handle(
      allowEffects,
      {
        headers: { origin: 'https://mattheard.net' },
        get: authorizationHeader,
      },
      response
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ uuid: 'author-uuid' });
    expect(sendJsonResponse).toHaveBeenCalledWith(allowEffects, response, 200, {
      uuid: 'author-uuid',
    });
    expect(setResponseHeader).toHaveBeenCalledWith(
      allowEffects,
      response,
      'Access-Control-Allow-Origin',
      'https://mattheard.net'
    );
  });

  it('answers Authorization preflight without verifying a token', async () => {
    const response = {
      set: jest.fn(),
      status: jest.fn(() => ({ send: jest.fn() })),
    };
    const sendEmptyResponse = jest.fn();
    const sendJsonResponse = jest.fn();
    const verifyIdToken = jest.fn();
    const handle = createGetAuthorUuidV2ExpressHandle({
      db: createDb(),
      auth: { verifyIdToken },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
      setResponseHeader: (permission, target, name, value) =>
        target.set(name, value),
      sendJsonResponse,
      sendEmptyResponse,
      allowedOrigins: ['https://mattheard.net'],
    });

    await handle(
      allowEffects,
      { method: 'OPTIONS', headers: { origin: 'https://mattheard.net' } },
      response
    );

    expect(response.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Authorization, Idempotency-Key'
    );
    expect(response.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://mattheard.net'
    );
    expect(sendEmptyResponse).toHaveBeenCalledWith(allowEffects, response, 204);
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(sendJsonResponse).not.toHaveBeenCalled();
  });

  it('does not reflect an unconfigured origin', async () => {
    const setResponseHeader = jest.fn();
    const handle = createGetAuthorUuidV2ExpressHandle({
      db: createDb(),
      auth: { verifyIdToken: jest.fn() },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
      setResponseHeader,
      sendJsonResponse: jest.fn(),
      sendEmptyResponse: jest.fn(),
      allowedOrigins: ['https://mattheard.net'],
    });
    const response = {};

    await handle(
      allowEffects,
      { method: 'GET', headers: { origin: 'https://attacker.example' } },
      response
    );

    expect(setResponseHeader).not.toHaveBeenCalledWith(
      allowEffects,
      response,
      'Access-Control-Allow-Origin',
      expect.any(String)
    );
  });

  it('rejects methods other than GET and OPTIONS', async () => {
    const setResponseHeader = jest.fn();
    const sendJsonResponse = jest.fn();
    const verifyIdToken = jest.fn();
    const handle = createGetAuthorUuidV2ExpressHandle({
      db: createDb(),
      auth: { verifyIdToken },
      randomUUID: jest.fn(),
      setAuthorDocument: jest.fn(),
      setResponseHeader,
      sendJsonResponse,
      sendEmptyResponse: jest.fn(),
    });
    const response = {};

    await handle(
      allowEffects,
      { method: 'POST', headers: { origin: 'https://attacker.example' } },
      response
    );

    expect(setResponseHeader).toHaveBeenCalledWith(
      allowEffects,
      response,
      'Allow',
      'GET, OPTIONS'
    );
    expect(sendJsonResponse).toHaveBeenCalledWith(
      allowEffects,
      response,
      405,
      'Method not allowed'
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
