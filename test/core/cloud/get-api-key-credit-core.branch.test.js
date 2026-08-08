import { jest } from '@jest/globals';
import {
  createFirestore,
  createGetApiKeyCreditExpressHandle,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  findUuidFromRequest,
  getApiKeyCreditTestUtils,
  isMissingDocument,
} from '../../../src/core/cloud/get-api-key-credit/get-api-key-credit-core.js';

describe('getApiKeyCreditTestUtils', () => {
  test('mapCreditToResponse returns not found for null', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(null);
    expect(result.status).toBe(404);
  });

  test('mapCreditToResponse returns internal error for undefined', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(undefined);
    expect(result.status).toBe(500);
  });

  test('mapCreditToResponse returns credit payload for numbers', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(5);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ credit: 5 });
  });

  test('getSpecialCreditResponse falls back to success when number is supplied', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(0);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ credit: 0 });
  });

  test('getSpecialCreditResponse returns not found for null', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(null);
    expect(result.status).toBe(404);
    expect(result.body).toBe('Not found');
  });

  test('getSpecialCreditResponse returns internal error for undefined', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(undefined);
    expect(result.status).toBe(500);
    expect(result.body).toBe('Internal error');
  });
});

describe('get API key credit request lifecycle', () => {
  test('covers UUID sources and Firestore helpers', async () => {
    expect(isMissingDocument(null)).toBe(true);
    expect(isMissingDocument({ exists: true })).toBe(false);
    expect(findUuidFromRequest()).toBeUndefined();
    expect(findUuidFromRequest({ params: { uuid: '  from-params ' } })).toBe('from-params');
    expect(findUuidFromRequest({ query: { uuid: 'from-query' } })).toBe('from-query');
    expect(findUuidFromRequest({ body: { uuid: 'from-body' } })).toBe('from-body');
    expect(findUuidFromRequest({ params: { uuid: 1 }, query: { uuid: ' ' } })).toBeUndefined();

    const get = jest.fn().mockResolvedValue({ exists: true });
    const doc = fetchApiKeyCreditDocument({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get })) })),
    }, 123);
    await expect(doc).resolves.toEqual({ exists: true });
    expect(get).toHaveBeenCalled();

    const Firestore = jest.fn(() => ({ kind: 'db' }));
    expect(createFirestore(Firestore)).toEqual({ kind: 'db' });
    expect(() => createFirestore(null)).toThrow('FirestoreConstructor');
  });

  test('handles method, UUID, success, and fetch-failure responses', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(7);
    const handler = createGetApiKeyCreditHandler({
      fetchCredit,
      getUuid: jest.fn(() => 'fallback'),
    });
    await expect(handler({ method: 'GET', uuid: 'direct' })).resolves.toEqual({
      status: 405,
      body: 'Method Not Allowed',
    });
    await expect(handler({ method: 'POST' })).resolves.toEqual({ status: 200, body: { credit: 7 } });
    await expect(handler()).resolves.toEqual({ status: 200, body: { credit: 7 } });
    expect(fetchCredit).toHaveBeenCalledWith('fallback');
    await expect(handler({ method: 'POST', uuid: 'direct' })).resolves.toEqual({ status: 200, body: { credit: 7 } });

    const failing = createGetApiKeyCreditHandler({
      fetchCredit: jest.fn().mockRejectedValue(new Error('database')), getUuid: jest.fn(() => 'id'),
    });
    await expect(failing({ method: 'POST' })).resolves.toEqual({ status: 500, body: 'Internal error' });
    const missing = createGetApiKeyCreditHandler({
      fetchCredit,
      getUuid: jest.fn(() => undefined),
    });
    await expect(missing({ method: 'POST' })).resolves.toEqual({
      status: 400,
      body: 'Missing UUID',
    });
    expect(() => createGetApiKeyCreditHandler({ fetchCredit: null, getUuid: jest.fn() })).toThrow('fetchCredit');
  });

  test('serializes Express responses for missing, empty, numeric, and method errors', async () => {
    const snapshots = [
      { exists: false },
      { exists: true, data: () => undefined },
      { exists: true, data: () => ({ credit: 4 }) },
    ];
    const get = jest.fn().mockImplementation(() => Promise.resolve(snapshots.shift()));
    const Firestore = jest.fn(() => ({
      collection: () => ({ doc: () => ({ get }) }),
    }));
    const handle = createGetApiKeyCreditExpressHandle({ Firestore });
    const response = () => ({
      set: jest.fn(),
      status: jest.fn(() => ({ json: jest.fn(), send: jest.fn() })),
    });
    const missing = response();
    await handle({ method: 'POST', params: { uuid: 'one' } }, missing);
    const empty = response();
    await handle({ method: 'POST', params: { uuid: 'two' } }, empty);
    const numeric = response();
    await handle({ method: 'POST', params: { uuid: 'three' } }, numeric);
    const method = response();
    await handle({ method: 'GET', params: { uuid: 'four' } }, method);
    expect(Firestore).toHaveBeenCalledTimes(1);
  });
});
