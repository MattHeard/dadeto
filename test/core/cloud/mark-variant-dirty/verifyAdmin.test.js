import { describe, expect, test, jest } from '@jest/globals';
import { createVerifyAdmin } from '../../../../src/core/cloud/mark-variant-dirty/verifyAdmin.js';

const permission = Object.freeze({ scope: 'test-request' });
const logger = { warn: jest.fn() };

describe('createVerifyAdmin', () => {
  test('sends missing token response when Authorization header absent', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger,
    });

    const req = { get: jest.fn().mockReturnValue('') };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(
      permission,
      res,
      'Missing token'
    );
  });

  test('uses default header reader when request lacks get function', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger,
    });

    const res = {};
    const authorised = await verifyAdmin(permission, {}, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(
      permission,
      res,
      'Missing token'
    );
  });

  test('treats a non-string Authorization header as a missing token', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger,
    });

    const req = { get: jest.fn().mockReturnValue(undefined) };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(false);
    expect(req.get).toHaveBeenCalledWith('Authorization');
    expect(sendUnauthorized).toHaveBeenCalledWith(
      permission,
      res,
      'Missing token'
    );
  });

  test('invokes collaborators to validate admin access', async () => {
    const verifyToken = jest.fn().mockResolvedValue({ uid: 'admin' });
    const isAdminUid = jest.fn().mockReturnValue(true);
    const sendUnauthorized = jest.fn();
    const sendForbidden = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid,
      sendUnauthorized,
      sendForbidden,
      logger,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer good') };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(true);
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
      logger,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(false);
    expect(verifyToken).toHaveBeenCalledWith('nope');
    expect(isAdminUid).toHaveBeenCalledWith({ uid: 'user' });
    expect(sendForbidden).toHaveBeenCalledWith(permission, res);
  });

  test('uses built-in invalid token message when error lacks detail', async () => {
    const error = new Error('bad token');
    const verifyToken = jest.fn().mockRejectedValue(error);
    const sendUnauthorized = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(permission, res, 'bad token');
  });

  test('uses generic invalid token message when error lacks detail', async () => {
    const verifyToken = jest.fn().mockRejectedValue({});
    const sendUnauthorized = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger,
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(permission, req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(
      permission,
      res,
      'Invalid token'
    );
  });
});
