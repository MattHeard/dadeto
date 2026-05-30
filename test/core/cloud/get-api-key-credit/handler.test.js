import { jest } from '@jest/globals';
import {
  createGetApiKeyCreditExpressHandle,
  createGetApiKeyCreditHandler,
  findUuidFromRequest,
} from '../../../../src/core/cloud/get-api-key-credit/get-api-key-credit-core.js';

describe('createGetApiKeyCreditHandler', () => {
  const createDependencies = ({
    fetchCredit = jest.fn(),
    getUuid = jest.fn(),
  } = {}) => ({ fetchCredit, getUuid });

  it('throws when fetchCredit is not provided', () => {
    expect(() =>
      createGetApiKeyCreditHandler({
        fetchCredit: null,
        getUuid: jest.fn(),
      })
    ).toThrow(new TypeError('fetchCredit must be a function'));
  });

  it('throws when getUuid is not provided', () => {
    expect(() =>
      createGetApiKeyCreditHandler({
        fetchCredit: jest.fn(),
        getUuid: null,
      })
    ).toThrow(new TypeError('getUuid must be a function'));
  });

  it('rejects non-POST requests', async () => {
    const fetchCredit = jest.fn();
    const getUuid = jest.fn();
    const handler = createGetApiKeyCreditHandler({ fetchCredit, getUuid });

    const response = await handler({ method: 'GET' });

    expect(response).toEqual({ status: 405, body: 'Method Not Allowed' });
    expect(getUuid).not.toHaveBeenCalled();
    expect(fetchCredit).not.toHaveBeenCalled();
  });

  it('returns 400 when UUID is missing', async () => {
    const fetchCredit = jest.fn();
    const getUuid = jest.fn().mockReturnValue('');
    const handler = createGetApiKeyCreditHandler({ fetchCredit, getUuid });

    const response = await handler({ method: 'POST', params: {}, query: {} });

    expect(getUuid).toHaveBeenCalledWith({
      method: 'POST',
      params: {},
      query: {},
    });
    expect(response).toEqual({ status: 400, body: 'Missing UUID' });
    expect(fetchCredit).not.toHaveBeenCalled();
  });

  it('skips getUuid when uuid is provided directly', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(42);
    const getUuid = jest.fn();
    const handler = createGetApiKeyCreditHandler({ fetchCredit, getUuid });

    const response = await handler({ method: 'POST', uuid: 'abc-123' });

    expect(getUuid).not.toHaveBeenCalled();
    expect(fetchCredit).toHaveBeenCalledWith('abc-123');
    expect(response).toEqual({ status: 200, body: { credit: 42 } });
  });

  it('returns 404 when credit is null', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(null);
    const handler = createGetApiKeyCreditHandler(
      createDependencies({
        fetchCredit,
        getUuid: jest.fn().mockReturnValue('uuid'),
      })
    );

    const response = await handler({ method: 'POST', params: {}, query: {} });

    expect(response).toEqual({ status: 404, body: 'Not found' });
  });

  it('returns 500 when credit is undefined', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(undefined);
    const handler = createGetApiKeyCreditHandler(
      createDependencies({
        fetchCredit,
        getUuid: jest.fn().mockReturnValue('uuid'),
      })
    );

    const response = await handler({ method: 'POST' });

    expect(response).toEqual({ status: 500, body: 'Internal error' });
  });

  it('returns 500 when fetchCredit throws', async () => {
    const fetchCredit = jest.fn().mockRejectedValue(new Error('boom'));
    const handler = createGetApiKeyCreditHandler(
      createDependencies({
        fetchCredit,
        getUuid: jest.fn().mockReturnValue('uuid'),
      })
    );

    const response = await handler({ method: 'POST' });

    expect(response).toEqual({ status: 500, body: 'Internal error' });
  });

  it('returns 200 with fetched credit', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(12);
    const handler = createGetApiKeyCreditHandler(
      createDependencies({
        fetchCredit,
        getUuid: jest.fn().mockReturnValue('uuid'),
      })
    );

    const response = await handler({ method: 'POST', params: {}, query: {} });

    expect(fetchCredit).toHaveBeenCalledWith('uuid');
    expect(response).toEqual({ status: 200, body: { credit: 12 } });
  });

  it('treats non-string methods as POST requests', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(5);
    const getUuid = jest.fn().mockReturnValue('generated-uuid');
    const handler = createGetApiKeyCreditHandler({ fetchCredit, getUuid });

    const response = await handler({ params: { id: 1 } });

    expect(getUuid).toHaveBeenCalledWith({ params: { id: 1 } });
    expect(fetchCredit).toHaveBeenCalledWith('generated-uuid');
    expect(response).toEqual({ status: 200, body: { credit: 5 } });
  });

  it('supports being invoked without a request object', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(3);
    const getUuid = jest.fn().mockReturnValue('helper-uuid');
    const handler = createGetApiKeyCreditHandler({ fetchCredit, getUuid });

    const response = await handler();

    expect(getUuid).toHaveBeenCalledWith({});
    expect(fetchCredit).toHaveBeenCalledWith('helper-uuid');
    expect(response).toEqual({ status: 200, body: { credit: 3 } });
  });
});

describe('findUuidFromRequest', () => {
  it('reads uuid values from params, query, then body', () => {
    expect(
      findUuidFromRequest({
        params: { uuid: ' params-uuid ' },
        query: { uuid: 'query-uuid' },
        body: { uuid: 'body-uuid' },
      })
    ).toBe('params-uuid');
    expect(
      findUuidFromRequest({
        params: { uuid: ' ' },
        query: { uuid: ' query-uuid ' },
        body: { uuid: 'body-uuid' },
      })
    ).toBe('query-uuid');
    expect(
      findUuidFromRequest({
        params: { uuid: 123 },
        query: {},
        body: { uuid: ' body-uuid ' },
      })
    ).toBe('body-uuid');
    expect(findUuidFromRequest()).toBeUndefined();
  });
});

describe('createGetApiKeyCreditExpressHandle', () => {
  it('memoizes Firestore and sends JSON success responses', async () => {
    const data = jest.fn(() => ({ credit: 7 }));
    const get = jest.fn().mockResolvedValue({ exists: true, data });
    const doc = jest.fn(() => ({ get }));
    const collection = jest.fn(() => ({ doc }));
    const Firestore = jest.fn(function Firestore() {
      return { collection };
    });
    const handle = createGetApiKeyCreditExpressHandle({ Firestore });
    const res = {
      set: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
    };

    await handle({ method: 'POST', body: { uuid: 'abc' } }, res);
    await handle({ method: 'POST', body: { uuid: 'def' } }, res);

    expect(Firestore).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith('api-key-credit');
    expect(doc).toHaveBeenNthCalledWith(1, 'abc');
    expect(doc).toHaveBeenNthCalledWith(2, 'def');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ credit: 7 });
  });

  it('sets Allow for method failures and sends string bodies', async () => {
    const Firestore = jest.fn();
    const handle = createGetApiKeyCreditExpressHandle({ Firestore });
    const res = {
      set: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
    };

    await handle({ method: 'GET' }, res);

    expect(Firestore).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
  });

  it('maps missing documents and missing data through the Express bridge', async () => {
    const snapshots = [{ exists: false }, { exists: true, data: jest.fn() }];
    const get = jest
      .fn()
      .mockResolvedValueOnce(snapshots[0])
      .mockResolvedValueOnce(snapshots[1]);
    const doc = jest.fn(() => ({ get }));
    const collection = jest.fn(() => ({ doc }));
    const Firestore = jest.fn(function Firestore() {
      return { collection };
    });
    const handle = createGetApiKeyCreditExpressHandle({ Firestore });
    const res = {
      set: jest.fn(),
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
    };

    await handle({ method: 'POST', body: { uuid: 'missing' } }, res);
    await handle({ method: 'POST', body: { uuid: 'empty-data' } }, res);

    expect(res.status).toHaveBeenNthCalledWith(1, 404);
    expect(res.send).toHaveBeenNthCalledWith(1, 'Not found');
    expect(res.status).toHaveBeenNthCalledWith(2, 500);
    expect(res.send).toHaveBeenNthCalledWith(2, 'Internal error');
  });
});
