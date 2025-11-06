import { jest } from '@jest/globals';
import {
  getAllowedOrigins,
  isAllowedOrigin,
  createHandleCorsOrigin,
  createCorsOptions,
  findPageRef,
  findVariantRef,
  markVariantDirtyImpl,
  matchAuthHeader,
  createIsAdminUid,
  parseMarkVariantRequestBody,
  createHandleRequest,
} from '../../../../src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js';
import { productionOrigins } from '../../../../src/core/cloud/cloud-core.js';

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
  });

  describe('findVariantRef', () => {
    it('returns null when page reference is missing', async () => {
      const firebase = {
        findPageRef: jest.fn().mockResolvedValue(null),
      };

      await expect(
        findVariantRef({}, 7, 'variant-a', firebase)
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
        findVariantRef({ db: true }, 8, 'variant-a', firebase)
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
  });

  describe('auth helpers', () => {
    it('extracts bearer token via matchAuthHeader', () => {
      expect(matchAuthHeader('Bearer token-value')[1]).toBe('token-value');
      expect(matchAuthHeader('Basic abc')).toBeNull();
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
  });
});
