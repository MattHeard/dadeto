import { describe, expect, test, jest } from '@jest/globals';
import { createVerifyAdmin } from '../../../../src/core/cloud/mark-variant-dirty/verifyAdmin.js';

describe('createVerifyAdmin', () => {
  test('throws when verifyToken is missing', () => {
    expect(() => createVerifyAdmin()).toThrow(
      new TypeError('verifyToken must be provided')
    );
  });

  test('throws when isAdminUid is missing', () => {
    expect(() =>
      createVerifyAdmin({
        verifyToken: jest.fn(),
      })
    ).toThrow(new TypeError('isAdminUid must be provided'));
  });

  test('throws when sendUnauthorized is missing', () => {
    expect(() =>
      createVerifyAdmin({
        verifyToken: jest.fn(),
        isAdminUid: jest.fn(),
      })
    ).toThrow(new TypeError('sendUnauthorized must be provided'));
  });

  test('throws when sendForbidden is missing', () => {
    expect(() =>
      createVerifyAdmin({
        verifyToken: jest.fn(),
        isAdminUid: jest.fn(),
        sendUnauthorized: jest.fn(),
      })
    ).toThrow(new TypeError('sendForbidden must be provided'));
  });

  test('sends missing token response when Authorization header absent', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
    });

    const req = { get: jest.fn().mockReturnValue('') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Missing token');
  });

  test('uses default header reader when request lacks get function', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
    });

    const res = {};
    const authorised = await verifyAdmin({}, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Missing token');
  });

  test('treats a non-string Authorization header as a missing token', async () => {
    const sendUnauthorized = jest.fn();
    const verifyAdmin = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
    });

    const req = { get: jest.fn().mockReturnValue(undefined) };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(req.get).toHaveBeenCalledWith('Authorization');
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Missing token');
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
    });

    const req = { get: jest.fn().mockReturnValue('Bearer good') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

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

  test('falls back to default invalid token message when custom handler is empty', async () => {
    const error = new Error('token exploded');
    const verifyToken = jest.fn().mockRejectedValue(error);
    const getInvalidTokenMessage = jest.fn().mockReturnValue('');
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
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'token exploded');
  });

  test('uses built-in invalid token message when error lacks detail', async () => {
    const verifyToken = jest.fn().mockRejectedValue({});
    const sendUnauthorized = jest.fn();

    const verifyAdmin = createVerifyAdmin({
      verifyToken,
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
    });

    const req = { get: jest.fn().mockReturnValue('Bearer nope') };
    const res = {};

    const authorised = await verifyAdmin(req, res);

    expect(authorised).toBe(false);
    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Invalid token');
  });
});
