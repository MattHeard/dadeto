import { describe, test, expect, jest } from '@jest/globals';
import { handler } from '../../infra/cloud-functions/get-api-key-credit/logic.js';

/**
 *
 */
function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };
}

describe('getApiKeyCredit handler', () => {
  test('responds 400 when uuid missing', async () => {
    const req = { params: {}, query: {} };
    const res = createRes();
    await handler(req, res, { repo: {} });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing UUID');
  });

  test('returns credit for uuid in params', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ exists: true, data: () => ({ credit: 7 }) });
    const repo = { doc: () => ({ get }) };
    const req = { params: { uuid: 'u1' }, query: {} };
    const res = createRes();
    await handler(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ credit: 7 });
  });

  test('supports uuid in query', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ exists: true, data: () => ({ credit: 3 }) });
    const repo = { doc: () => ({ get }) };
    const req = { params: {}, query: { uuid: 'u2' } };
    const res = createRes();
    await handler(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ credit: 3 });
  });

  test('returns 404 when uuid not found', async () => {
    const get = jest.fn().mockResolvedValue({ exists: false });
    const repo = { doc: () => ({ get }) };
    const req = { params: { uuid: 'u1' }, query: {} };
    const res = createRes();
    await handler(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('handles fetch errors', async () => {
    const get = jest.fn().mockRejectedValue(new Error('fail'));
    const repo = { doc: () => ({ get }) };
    const req = { params: { uuid: 'u1' }, query: {} };
    const res = createRes();
    await handler(req, res, { repo });
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
