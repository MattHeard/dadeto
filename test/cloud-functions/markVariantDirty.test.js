import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  handleRequest,
  markVariantDirtyImpl,
} from '../../infra/cloud-functions/mark-variant-dirty/index.js';
import { mockVerifyIdToken } from '../mocks/firebase-admin-auth.js';

/**
 * Create a mock response object.
 * @returns {{status: jest.Mock, send: jest.Mock, json: jest.Mock}}
 */
function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };
}

describe('handleRequest', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('rejects non-POST method', async () => {
    const req = { method: 'GET', get: () => '' };
    const res = createRes();
    await handleRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('rejects missing token', async () => {
    const req = { method: 'POST', get: () => '' };
    const res = createRes();
    await handleRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad'));
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer x' : ''),
    };
    const res = createRes();
    await handleRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects non-admin uid', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'other' });
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer t' : ''),
    };
    const res = createRes();
    await handleRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('rejects invalid input', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer t' : ''),
      body: { page: 'x', variant: '' },
    };
    const res = createRes();
    await handleRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when variant not found', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const markFn = jest.fn().mockResolvedValue(false);
    const fakeDb = {};
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer t' : ''),
      body: { page: 5, variant: 'a' },
    };
    const res = createRes();
    await handleRequest(req, res, { markFn, db: fakeDb });
    expect(markFn).toHaveBeenCalledWith(fakeDb, 5, 'a');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('marks variant when valid', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const markFn = jest.fn().mockResolvedValue(true);
    const fakeDb = {};
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer t' : ''),
      body: { page: 5, variant: 'a' },
    };
    const res = createRes();
    await handleRequest(req, res, { markFn, db: fakeDb });
    expect(markFn).toHaveBeenCalledWith(fakeDb, 5, 'a');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('handles errors', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const markFn = jest.fn().mockRejectedValue(new Error('fail'));
    const fakeDb = {};
    const req = {
      method: 'POST',
      get: h => (h === 'Authorization' ? 'Bearer t' : ''),
      body: { page: 5, variant: 'a' },
    };
    const res = createRes();
    await handleRequest(req, res, { markFn, db: fakeDb });
    expect(markFn).toHaveBeenCalledWith(fakeDb, 5, 'a');
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('markVariantDirtyImpl', () => {
  test('updates variant when found', async () => {
    const update = jest.fn();
    const variantsQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest
        .fn()
        .mockResolvedValue({ empty: false, docs: [{ ref: { update } }] }),
    };
    const pagesQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ ref: { collection: () => variantsQuery } }],
      }),
    };
    const db = { collectionGroup: () => pagesQuery };
    const ok = await markVariantDirtyImpl(db, 5, 'a');
    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ dirty: null });
  });

  test('returns false when page not found', async () => {
    const pagesQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true }),
    };
    const db = { collectionGroup: () => pagesQuery };
    const ok = await markVariantDirtyImpl(db, 5, 'a');
    expect(ok).toBe(false);
  });

  test('returns false when variant not found', async () => {
    const variantsQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true }),
    };
    const pagesQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ ref: { collection: () => variantsQuery } }],
      }),
    };
    const db = { collectionGroup: () => pagesQuery };
    const ok = await markVariantDirtyImpl(db, 5, 'a');
    expect(ok).toBe(false);
  });

  test('injects firebase helpers into findVariantRef', async () => {
    const variantRef = { update: jest.fn() };
    const pageRef = {};
    const findPagesSnap = jest.fn().mockResolvedValue('psnap');
    const findVariantsSnap = jest.fn().mockResolvedValue('vsnap');
    const refFromSnap = jest
      .fn()
      .mockReturnValueOnce(pageRef)
      .mockReturnValueOnce(variantRef);
    const db = {};
    await markVariantDirtyImpl(db, 5, 'a', {
      findPagesSnap,
      findVariantsSnap,
      refFromSnap,
    });
    expect(findPagesSnap).toHaveBeenCalledWith(db, 5);
    expect(refFromSnap).toHaveBeenNthCalledWith(1, 'psnap');
    expect(findVariantsSnap).toHaveBeenCalledWith(pageRef, 'a');
    expect(refFromSnap).toHaveBeenNthCalledWith(2, 'vsnap');
    expect(variantRef.update).toHaveBeenCalledWith({ dirty: null });
  });
});
