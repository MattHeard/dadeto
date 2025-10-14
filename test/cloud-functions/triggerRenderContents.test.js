import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as mod from '../../src/cloud/render-contents/index.js';
import { mockVerifyIdToken } from '../mocks/firebase-admin-auth.js';

const { handleRenderRequest } = mod;
const allowedOrigin = 'https://mattheard.net';

/**
 *
 */
/**
 * Create a mock response object.
 * @returns {{status: jest.Mock, send: jest.Mock, json: jest.Mock, set: jest.Mock}} Response
 */
function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
  };
}

function createReq({ method = 'POST', origin = allowedOrigin, authorization = '' } = {}) {
  return {
    method,
    get: h => {
      if (h === 'Origin') {
        return origin ?? '';
      }
      if (h === 'Authorization') {
        return authorization;
      }
      return '';
    },
  };
}

function expectCorsHeaders(res, { origin = allowedOrigin, allowed = true } = {}) {
  expect(res.set).toHaveBeenCalledWith(
    'Access-Control-Allow-Headers',
    'Authorization'
  );
  expect(res.set).toHaveBeenCalledWith(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );
  if (origin === null) {
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.set).not.toHaveBeenCalledWith('Vary', 'Origin');
  } else if (!allowed) {
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
    expect(res.set).toHaveBeenCalledWith('Vary', 'Origin');
  } else {
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
    expect(res.set).toHaveBeenCalledWith('Vary', 'Origin');
  }
}

describe('handleRenderRequest', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('rejects non-POST method', async () => {
    const req = createReq({ method: 'GET' });
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expectCorsHeaders(res);
  });

  test('handles OPTIONS preflight', async () => {
    const req = createReq({ method: 'OPTIONS' });
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'POST, OPTIONS'
    );
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Authorization'
    );
    expectCorsHeaders(res);
  });

  test('rejects disallowed origin', async () => {
    const req = createReq({ origin: 'https://evil.com' });
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expectCorsHeaders(res, { origin: 'https://evil.com', allowed: false });
  });

  test('rejects missing token', async () => {
    const req = createReq();
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expectCorsHeaders(res);
  });

  test('rejects invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad'));
    const req = createReq({ authorization: 'Bearer x' });
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expectCorsHeaders(res);
  });

  test('rejects non-admin uid', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'other' });
    const req = createReq({ authorization: 'Bearer t' });
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expectCorsHeaders(res);
  });

  test('triggers render for admin user', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const renderFn = jest.fn().mockResolvedValue(null);
    const req = createReq({ authorization: 'Bearer t' });
    const res = createRes();
    await handleRenderRequest(req, res, { renderFn });
    expect(renderFn).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expectCorsHeaders(res);
  });

  test('handles render errors', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const renderFn = jest.fn().mockRejectedValue(new Error('fail'));
    const req = createReq({ authorization: 'Bearer t' });
    const res = createRes();
    await handleRenderRequest(req, res, { renderFn });
    expect(res.status).toHaveBeenCalledWith(500);
    expectCorsHeaders(res);
  });
});
