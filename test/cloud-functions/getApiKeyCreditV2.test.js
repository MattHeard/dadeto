import { describe, test, expect, jest } from '@jest/globals';
import { handleRequest } from '../../infra/cloud-functions/get-api-key-credit-v2/logic.js';

/**
 *
 */
function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
  };
}

describe('getApiKeyCreditV2 handleRequest', () => {
  test('rejects non-GET method', async () => {
    const req = { method: 'POST', path: '', params: {}, query: {} };
    const res = createRes();
    await handleRequest(req, res, { repo: {} });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.set).toHaveBeenCalledWith('Allow', 'GET');
  });

  test('responds 400 when uuid missing', async () => {
    const req = { method: 'GET', path: '', params: {}, query: {} };
    const res = createRes();
    await handleRequest(req, res, { repo: {} });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns credit using path match', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ exists: true, data: () => ({ credit: 9 }) });
    const repo = { doc: () => ({ get }) };
    const req = {
      method: 'GET',
      path: '/api-keys/12345678-1234-1234-1234-123456789abc/credit',
      params: {},
      query: {},
    };
    const res = createRes();
    await handleRequest(req, res, { repo });
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ credit: 9 });
  });

  test('returns 404 when not found via query uuid', async () => {
    const get = jest.fn().mockResolvedValue({ exists: false });
    const repo = { doc: () => ({ get }) };
    const req = { method: 'GET', path: '', params: {}, query: { uuid: 'x' } };
    const res = createRes();
    await handleRequest(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('handles repository errors', async () => {
    const get = jest.fn().mockRejectedValue(new Error('fail'));
    const repo = { doc: () => ({ get }) };
    const req = { method: 'GET', path: '', params: { uuid: 'x' }, query: {} };
    const res = createRes();
    await handleRequest(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
