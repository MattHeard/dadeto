import { describe, expect, it, jest } from '@jest/globals';
import {
  createGetAuthorUuidV2ExpressHandle,
  createGetAuthorUuidV2Handler,
} from '../../../../src/core/cloud/get-author-uuid-v2/get-author-uuid-v2-core.js';

const authorizationHeader = name => {
  if (name === 'authorization') return 'Bearer token';
  return null;
};

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
    });

    await expect(
      handler({
        get: authorizationHeader,
      })
    ).resolves.toEqual({ status: 200, body: { uuid: 'author-uuid' } });
    expect(db.collection).toHaveBeenCalledWith('authors');
    expect(db.doc).toHaveBeenCalledWith('user-1');
  });

  it('creates an author uuid when one is missing', async () => {
    const set = jest.fn().mockResolvedValue();
    const get = jest.fn().mockResolvedValue({ data: () => undefined });
    const doc = { get, set };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => doc) })),
    };
    const handler = createGetAuthorUuidV2Handler({
      db,
      auth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }) },
      randomUUID: jest.fn().mockReturnValue('uuid-1'),
    });

    await expect(
      handler({
        get: authorizationHeader,
      })
    ).resolves.toEqual({ status: 200, body: { uuid: 'uuid-1' } });
    expect(set).toHaveBeenCalledWith({ uuid: 'uuid-1' }, { merge: true });
  });

  it('rejects missing or invalid tokens', async () => {
    const handler = createGetAuthorUuidV2Handler({
      db: {
        collection: jest.fn(),
      },
      auth: { verifyIdToken: jest.fn() },
      randomUUID: jest.fn(),
    });

    await expect(handler({})).resolves.toEqual({
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
    });

    await expect(handler()).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
  });

  it('writes the handler result to an express response', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
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
    });

    await handle(
      {
        get: authorizationHeader,
      },
      {
        status,
      }
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ uuid: 'author-uuid' });
  });
});
