import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as mod from '../../src/cloud/render-contents/index.js';
import { mockVerifyIdToken } from '../mocks/firebase-admin-auth.js';

const { handleRenderRequest } = mod;

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

describe('handleRenderRequest', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('rejects non-POST method', async () => {
    const req = { method: 'GET', get: () => '' };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('handles OPTIONS preflight', async () => {
    const req = { method: 'OPTIONS', get: () => '' };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'POST'
    );
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Authorization'
    );
  });

  test('rejects disallowed origin', async () => {
    const req = {
      method: 'POST',
      get: h => {
        if (h === 'Origin') {
          return 'https://evil.com';
        }
        return '';
      },
    };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('rejects missing token', async () => {
    const req = { method: 'POST', get: () => '' };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad'));
    const req = {
      method: 'POST',
      get: h => {
        if (h === 'Authorization') {
          return 'Bearer x';
        }
        return '';
      },
    };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects non-admin uid', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'other' });
    const req = {
      method: 'POST',
      get: h => {
        if (h === 'Authorization') {
          return 'Bearer t';
        }
        return '';
      },
    };
    const res = createRes();
    await handleRenderRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('triggers render for admin user', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const renderFn = jest.fn().mockResolvedValue(null);
    const req = {
      method: 'POST',
      get: h => {
        if (h === 'Authorization') {
          return 'Bearer t';
        }
        return '';
      },
    };
    const res = createRes();
    await handleRenderRequest(req, res, { renderFn });
    expect(renderFn).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('handles render errors', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'qcYSrXTaj1MZUoFsAloBwT86GNM2',
    });
    const renderFn = jest.fn().mockRejectedValue(new Error('fail'));
    const req = {
      method: 'POST',
      get: h => {
        if (h === 'Authorization') {
          return 'Bearer t';
        }
        return '';
      },
    };
    const res = createRes();
    await handleRenderRequest(req, res, { renderFn });
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
