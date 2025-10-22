import { describe, expect, test, jest } from '@jest/globals';
import { createVerifyAdmin } from '../../../../src/core/cloud/mark-variant-dirty/verifyAdmin.js';

describe('createVerifyAdmin', () => {
  test('sends missing token response when Authorization header absent', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      missingTokenMessage: 'Need token',
    });

    const req = { get: jest.fn().mockReturnValue('') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Need token');
  });

  test('invokes collaborators to validate admin access', async () => {
    const getAuthHeader = jest.fn().mockReturnValue('Bearer good');
    const matchAuthHeader = jest.fn().mockReturnValue(['Bearer good', 'good']);
    const verifyToken = jest.fn().mockResolvedValue({ uid: 'admin' });
    const isAdminUid = jest.fn().mockReturnValue(true);
    const sendUnauthorized = jest.fn();
    const sendForbidden = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      getAuthHeader,
      matchAuthHeader,
      verifyToken,
      isAdminUid,
      sendUnauthorized,
      sendForbidden,
    });

    const req = {};
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(true);
    expect(getAuthHeader).toHaveBeenCalledWith(req);
    expect(matchAuthHeader).toHaveBeenCalledWith('Bearer good');
    expect(verifyToken).toHaveBeenCalledWith('good');
    expect(isAdminUid).toHaveBeenCalledWith({ uid: 'admin' });
    expect(sendUnauthorized).not.toHaveBeenCalled();
    expect(sendForbidden).not.toHaveBeenCalled();
  });

  test('sends forbidden response when token does not match admin user', async () => {
    const verifyToken = jest.fn().mockResolvedValue({ uid: 'user' });
    const isAdminUid = jest.fn().mockReturnValue(false);
    const sendForbidden = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid,
      sendUnauthorized: jest.fn(),
      sendForbidden,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(verifyToken).toHaveBeenCalledWith('nope');
    expect(isAdminUid).toHaveBeenCalledWith({ uid: 'user' });
    expect(sendForbidden).toHaveBeenCalledWith(res);
  });

  test('uses injected invalid token message on verification failure', async () => {
    const error = new Error('bad token');
    const verifyToken = jest.fn().mockRejectedValue(error);
    const getInvalidTokenMessage = jest.fn().mockReturnValue('Nope');
    const sendUnauthorized = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      getInvalidTokenMessage,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(getInvalidTokenMessage).toHaveBeenCalledWith(error);
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Nope');
  });
});
