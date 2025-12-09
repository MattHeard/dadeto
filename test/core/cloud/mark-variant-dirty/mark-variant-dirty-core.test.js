import { jest } from '@jest/globals';
import * as markVariantDirtyCore from '../../../../src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js';
import {
  getAuthHeader,
  isAllowedOrigin,
  matchAuthHeader,
  productionOrigins,
} from '../../../../src/core/cloud/cloud-core.js';
const {
  getAllowedOrigins,
  createHandleCorsOrigin,
  createCorsOptions,
  findPageRef,
  findPagesSnap,
  findVariantsSnap,
  findVariantRef,
  refFromSnap,
  markVariantDirtyImpl,
  sendUnauthorized,
  sendForbidden,
  createIsAdminUid,
  parseMarkVariantRequestBody,
  createHandleRequest,
  getRequestBody,
  getRequestMethod,
  hasStringMessage,
} = markVariantDirtyCore;

describe('mark-variant-dirty core helpers', () => {
  describe('getAllowedOrigins', () => {
    it('returns production origins when environment is prod', () => {
      expect(getAllowedOrigins({ DENDRITE_ENVIRONMENT: 'prod' })).toEqual(
        productionOrigins
      );
    });

    it('returns playwright origin when environment starts with t-', () => {
      expect(
        getAllowedOrigins({
          DENDRITE_ENVIRONMENT: 't-123',
          PLAYWRIGHT_ORIGIN: 'https://preview.local',
        })
      ).toEqual(['https://preview.local']);
    });

    it('returns empty array for t- environments without origin', () => {
      expect(getAllowedOrigins({ DENDRITE_ENVIRONMENT: 't-1' })).toEqual([]);
    });

    it('throws for unsupported environments', () => {
      expect(() =>
        getAllowedOrigins({ DENDRITE_ENVIRONMENT: 'stage' })
      ).toThrow(/Unsupported environment label/);
    });

    it('throws when the environment config is missing', () => {
      expect(() => getAllowedOrigins()).toThrow(
        /Unsupported environment label/
      );
    });
  });

  describe('isAllowedOrigin', () => {
    it('allows when origin is missing', () => {
      expect(isAllowedOrigin(undefined, ['https://allowed.test'])).toBe(true);
    });

    it('requires the origin to be present in the whitelist', () => {
      expect(
        isAllowedOrigin('https://forbidden.test', ['https://allowed.test'])
      ).toBe(false);
    });
  });

  describe('createHandleCorsOrigin', () => {
    it('throws when the predicate is not a function', () => {
      expect(() => createHandleCorsOrigin(null, [])).toThrow(
        new TypeError('isAllowedOrigin must be a function')
      );
    });

    it('invokes callback with allow flag when origin is permitted', () => {
      const predicate = jest
        .fn()
        .mockImplementation((origin, whitelist) => whitelist.includes(origin));
      const handleOrigin = createHandleCorsOrigin(predicate, [
        'https://allowed.test',
      ]);
      const cb = jest.fn();

      handleOrigin('https://allowed.test', cb);

      expect(predicate).toHaveBeenCalledWith('https://allowed.test', [
        'https://allowed.test',
      ]);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('invokes callback with an error when origin is rejected', () => {
      const predicate = jest.fn().mockReturnValue(false);
      const cb = jest.fn();

      createHandleCorsOrigin(predicate, [])('https://blocked.test', cb);

      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][0].message).toBe('CORS');
      expect(cb.mock.calls[0][1]).toBeUndefined();
    });

    it('passes null to the predicate when the origin is absent', () => {
      const predicate = jest.fn().mockReturnValue(false);
      const cb = jest.fn();

      createHandleCorsOrigin(predicate, [])(undefined, cb);

      expect(predicate).toHaveBeenCalledWith(null, []);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createCorsOptions', () => {
    it('throws when origin handler is not a function', () => {
      expect(() => createCorsOptions(null)).toThrow(
        new TypeError('handleCorsOrigin must be a function')
      );
    });

    it('returns configuration with default POST method', () => {
      const origin = jest.fn();
      expect(createCorsOptions(origin)).toEqual({
        origin,
        methods: ['POST'],
      });
    });

    it('allows overriding the methods array', () => {
      const origin = jest.fn();
      expect(createCorsOptions(origin, ['HEAD', 'POST'])).toEqual({
        origin,
        methods: ['HEAD', 'POST'],
      });
    });
  });

  describe('findPageRef', () => {
    it('uses helper overrides to resolve the page reference', async () => {
      const database = {};
      const snap = { id: 'snap' };
      const ref = { id: 'pageRef' };
      const findPagesSnap = jest.fn().mockResolvedValue(snap);
      const refFromSnap = jest.fn().mockReturnValue(ref);

      await expect(
        findPageRef(database, 3, { findPagesSnap, refFromSnap })
      ).resolves.toBe(ref);

      expect(findPagesSnap).toHaveBeenCalledWith(database, 3);
      expect(refFromSnap).toHaveBeenCalledWith(snap);
    });

    it('falls back to the built-in helpers when no overrides are supplied', async () => {
      const pagesSnap = { docs: [{ ref: 'defaultRef' }] };
      const get = jest.fn().mockResolvedValue(pagesSnap);
      const limit = jest.fn(() => ({ get }));
      const where = jest.fn(() => ({ limit }));
      const collectionGroup = jest.fn(() => ({ where }));
      const db = { collectionGroup };

      await expect(findPageRef(db, 7)).resolves.toBe('defaultRef');

      expect(collectionGroup).toHaveBeenCalledWith('pages');
      expect(where).toHaveBeenCalledWith('number', '==', 7);
      expect(limit).toHaveBeenCalledWith(1);
    });
  });

  describe('findPagesSnap and findVariantsSnap', () => {
    it('queries page documents by number', async () => {
      const get = jest.fn().mockResolvedValue('pagesSnap');
      const limit = jest.fn(() => ({ get }));
      const where = jest.fn(() => ({ limit }));
      const collectionGroup = jest.fn(() => ({ where }));
      const db = { collectionGroup };

      const result = await findPagesSnap(db, 4);

      expect(collectionGroup).toHaveBeenCalledWith('pages');
      expect(where).toHaveBeenCalledWith('number', '==', 4);
      expect(limit).toHaveBeenCalledWith(1);
      expect(result).toBe('pagesSnap');
    });

    it('queries variants within a page reference', async () => {
      const get = jest.fn().mockResolvedValue('variantsSnap');
      const limit = jest.fn(() => ({ get }));
      const where = jest.fn(() => ({ limit }));
      const collection = jest.fn(() => ({ where }));
      const pageRef = { collection };

      const result = await findVariantsSnap(pageRef, 'beta');

      expect(collection).toHaveBeenCalledWith('variants');
      expect(where).toHaveBeenCalledWith('name', '==', 'beta');
      expect(limit).toHaveBeenCalledWith(1);
      expect(result).toBe('variantsSnap');
    });
  });

  describe('refFromSnap', () => {
    it('returns the ref when a document exists', () => {
      const ref = { id: 'ref' };
      expect(refFromSnap({ docs: [{ ref }] })).toBe(ref);
    });

    it('returns null when the document is missing', () => {
      expect(refFromSnap({ docs: [] })).toBeNull();
      expect(refFromSnap(null)).toBeNull();
    });
  });

  describe('findVariantRef', () => {
    it('returns null when page reference is missing', async () => {
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue(null),
      };

      await expect(
        findVariantRef({
          database: {},
          pageNumber: 7,
          variantName: 'variant-a',
          firebase,
        })
      ).resolves.toBeNull();
    });

    it('returns the variant reference when found', async () => {
      const variantRef = { id: 'variantRef' };
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue('pageRef'),
        findVariantsSnap: jest.fn().mockResolvedValue('variantsSnap'),
        refFromSnap: jest.fn().mockReturnValue(variantRef),
      };

      await expect(
        findVariantRef({
          database: { db: true },
          pageNumber: 8,
          variantName: 'variant-a',
          firebase,
        })
      ).resolves.toBe(variantRef);

      expect(firebase.findPageRef).toHaveBeenCalledWith({ db: true }, 8, {
        findPagesSnap: expect.any(Function),
        refFromSnap: firebase.refFromSnap,
      });
      expect(firebase.findVariantsSnap).toHaveBeenCalledWith(
        'pageRef',
        'variant-a'
      );
      expect(firebase.refFromSnap).toHaveBeenCalledWith('variantsSnap');
    });

    it('uses built-in helpers when firebase overrides are omitted', async () => {
      const variantRef = { id: 'variantRef' };
      const variantsSnap = { docs: [{ ref: variantRef }] };
      const variantsGet = jest.fn().mockResolvedValue(variantsSnap);
      const variantsLimit = jest.fn(() => ({ get: variantsGet }));
      const variantsWhere = jest.fn(() => ({ limit: variantsLimit }));
      const pageRef = {
        collection: jest.fn(() => ({
          where: variantsWhere,
        })),
      };

      const pagesSnap = { docs: [{ ref: pageRef }] };
      const pagesGet = jest.fn().mockResolvedValue(pagesSnap);
      const pagesLimit = jest.fn(() => ({ get: pagesGet }));
      const pagesWhere = jest.fn(() => ({ limit: pagesLimit }));
      const collectionGroup = jest.fn(() => ({ where: pagesWhere }));
      const db = { collectionGroup };

      await expect(
        findVariantRef({
          database: db,
          pageNumber: 8,
          variantName: 'variant-b',
        })
      ).resolves.toBe(variantRef);

      expect(collectionGroup).toHaveBeenCalledWith('pages');
      expect(variantsWhere).toHaveBeenCalledWith('name', '==', 'variant-b');
    });
  });

  describe('markVariantDirtyImpl', () => {
    it('throws when database is not provided', async () => {
      await expect(markVariantDirtyImpl(1, 'a')).rejects.toThrow(
        new TypeError('db must be provided')
      );
    });

    it('returns false when the variant cannot be located', async () => {
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue(null),
      };

      await expect(
        markVariantDirtyImpl(1, 'missing', { db: {}, firebase })
      ).resolves.toBe(false);
    });

    it('updates the variant and returns true when found', async () => {
      const updateVariantDirty = jest.fn().mockResolvedValue(undefined);
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue('pageRef'),
        findVariantsSnap: jest.fn().mockResolvedValue('variantSnap'),
        refFromSnap: jest.fn().mockReturnValue('variantRef'),
      };

      await expect(
        markVariantDirtyImpl(42, 'test-variant', {
          db: {},
          firebase,
          updateVariantDirty,
        })
      ).resolves.toBe(true);

      expect(updateVariantDirty).toHaveBeenCalledWith('variantRef');
    });

    it('relies on the default update function when not overridden', async () => {
      const variantRef = { update: jest.fn().mockResolvedValue(undefined) };
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue('pageRef'),
        findVariantsSnap: jest.fn().mockResolvedValue('variantSnap'),
        refFromSnap: jest.fn().mockReturnValue(variantRef),
      };

      await expect(
        markVariantDirtyImpl(9, 'variant-b', { db: {}, firebase })
      ).resolves.toBe(true);

      expect(variantRef.update).toHaveBeenCalledWith({ dirty: null });
    });
  });

  describe('auth helpers', () => {
    it('extracts bearer token via matchAuthHeader', () => {
      expect(matchAuthHeader('Bearer token-value')[1]).toBe('token-value');
      expect(matchAuthHeader('Basic abc')).toBeNull();
    });

    it('reads the authorization header defensively', () => {
      const req = { get: jest.fn().mockReturnValue('Bearer token') };
      expect(getAuthHeader(req)).toBe('Bearer token');
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(getAuthHeader({})).toBe('');
      expect(getAuthHeader()).toBe('');
    });

    it('writes unauthorized and forbidden responses', () => {
      const res = {
        status: jest.fn(function status() {
          return res;
        }),
        send: jest.fn(),
      };

      sendUnauthorized(res, 'nope');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('nope');

      res.status.mockClear();
      res.send.mockClear();

      sendForbidden(res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden');
    });

    it('matches admin uid with createIsAdminUid', () => {
      const isAdmin = createIsAdminUid('admin-uid');
      expect(isAdmin({ uid: 'admin-uid' })).toBe(true);
      expect(isAdmin({ uid: 'another' })).toBe(false);
    });

    it('parses mark variant request body defensively', () => {
      expect(
        parseMarkVariantRequestBody({ page: '17', variant: 'beta' })
      ).toEqual({ pageNumber: 17, variantName: 'beta' });
      expect(parseMarkVariantRequestBody({})).toEqual({
        pageNumber: Number.NaN,
        variantName: '',
      });
      expect(parseMarkVariantRequestBody()).toEqual({
        pageNumber: Number.NaN,
        variantName: '',
      });
    });
  });

  describe('createHandleRequest', () => {
    const createResponse = () => {
      const res = {
        status: jest.fn(function status(code) {
          res.statusCode = code;
          return res;
        }),
        send: jest.fn(),
        json: jest.fn(),
      };
      return res;
    };

    it('validates handler dependencies', () => {
      expect(() =>
        createHandleRequest({ verifyAdmin: null, markVariantDirty: jest.fn() })
      ).toThrow(new TypeError('verifyAdmin must be a function'));

      expect(() =>
        createHandleRequest({ verifyAdmin: jest.fn(), markVariantDirty: null })
      ).toThrow(new TypeError('markVariantDirty must be a function'));
    });

    it('throws when invoked without any options', () => {
      expect(() => createHandleRequest()).toThrow(
        new TypeError('verifyAdmin must be a function')
      );
    });

    it('rejects disallowed HTTP methods', async () => {
      const verifyAdmin = jest.fn();
      const markVariantDirty = jest.fn();
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'GET' }, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.send).toHaveBeenCalledWith('POST only');
      expect(verifyAdmin).not.toHaveBeenCalled();
    });

    it('short-circuits when admin verification fails', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(false);
      const markVariantDirty = jest.fn();
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'POST' }, res);

      expect(markVariantDirty).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid request bodies', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn();
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'POST', body: { page: 'one' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input' });
      expect(markVariantDirty).not.toHaveBeenCalled();
    });

    it('responds with 404 when markVariantDirty reports missing variant', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn().mockResolvedValue(false);
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle(
        { method: 'POST', body: { page: 1, variant: 'missing' } },
        res
      );

      expect(res.status).toHaveBeenLastCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Variant not found' });
    });

    it('responds with 200 when markVariantDirty succeeds', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn().mockResolvedValue(true);
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'POST', body: { page: 2, variant: 'ok' } }, res);

      expect(res.status).toHaveBeenLastCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('responds with 500 when markVariantDirty throws', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn().mockRejectedValue(new Error('boom'));
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'POST', body: { page: 3, variant: 'err' } }, res);

      expect(res.status).toHaveBeenLastCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });

    it('reports generic failure when thrown error lacks a message', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn().mockRejectedValue({});
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();

      await handle({ method: 'POST', body: { page: 4, variant: 'err' } }, res);

      expect(res.status).toHaveBeenLastCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'update failed' });
    });

    it('honors dependency overrides for admin verification and marking', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn();
      const handle = createHandleRequest({ verifyAdmin, markVariantDirty });
      const res = createResponse();
      const overrideVerify = jest.fn().mockResolvedValue(true);
      const overrideMark = jest.fn().mockResolvedValue(true);

      await handle(
        { method: 'POST', body: { page: 11, variant: 'override' } },
        res,
        { verifyAdmin: overrideVerify, markFn: overrideMark }
      );

      expect(verifyAdmin).not.toHaveBeenCalled();
      expect(overrideVerify).toHaveBeenCalled();
      expect(overrideMark).toHaveBeenCalledWith(11, 'override');
    });

    it('supports custom body parsers for request validation', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn().mockResolvedValue(true);
      const parseRequestBody = jest.fn().mockReturnValue({
        pageNumber: 21,
        variantName: 'parsed',
      });
      const handle = createHandleRequest({
        verifyAdmin,
        markVariantDirty,
        parseRequestBody,
        allowedMethod: 'PATCH',
      });
      const res = createResponse();

      await handle({ method: 'PATCH', body: { ignored: true } }, res);

      expect(parseRequestBody).toHaveBeenCalledWith({ ignored: true });
      expect(markVariantDirty).toHaveBeenCalledWith(21, 'parsed');
    });

    it('rethrows unexpected errors from the request pipeline', async () => {
      const verifyAdmin = jest.fn().mockResolvedValue(true);
      const markVariantDirty = jest.fn();
      const parseRequestBody = () => {
        throw new Error('parse failure');
      };
      const handle = createHandleRequest({
        verifyAdmin,
        markVariantDirty,
        parseRequestBody,
      });
      const res = createResponse();

      await expect(
        handle({ method: 'POST', body: { page: 1 } }, res)
      ).rejects.toThrow('parse failure');
    });
  });

  describe('request helpers', () => {
    it('guards when requests are absent', () => {
      expect(getRequestBody()).toBeUndefined();
      expect(getRequestMethod()).toBeUndefined();
    });

    it('returns body and method when request exists', () => {
      const body = { page: 1 };
      const req = { body, method: 'POST' };

      expect(getRequestBody(req)).toBe(body);
      expect(getRequestMethod(req)).toBe('POST');
    });
  });

  describe('error inspection helpers', () => {
    it('detects string messages', () => {
      expect(hasStringMessage({ message: 'hello' })).toBe(true);
      expect(hasStringMessage({ message: 123 })).toBe(false);
      expect(hasStringMessage(null)).toBe(false);
    });
  });
});
