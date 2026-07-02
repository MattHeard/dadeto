import { jest } from '@jest/globals';
import {
  cloudCoreTestUtils,
  createVerifyAdmin,
} from '../../../src/core/cloud/cloud-core.js';

describe('createVerifyAdmin error responses', () => {
  const buildEnv = verifyToken => {
    const sendUnauthorized = jest.fn();
    const sendForbidden = jest.fn();
    const handler = createVerifyAdmin({
      verifyToken,
      isAdminUid: () => true,
      sendUnauthorized,
      sendForbidden,
    });
    return { handler, sendUnauthorized, sendForbidden };
  };

  const req = { get: () => 'Bearer token' };

  test('uses provided message when error exposes string message', async () => {
    const errorObject = { message: 'boom' };
    const { handler, sendUnauthorized } = buildEnv(() =>
      Promise.reject(errorObject)
    );
    await handler(req, {});
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'boom');
  });

  test('falls back when error message is not a string', async () => {
    const errorObject = { message: 42 };
    const { handler, sendUnauthorized } = buildEnv(() =>
      Promise.reject(errorObject)
    );
    await handler(req, {});
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'Invalid token');
  });

  test('uses default invalid token message for raw string errors', async () => {
    const { handler, sendUnauthorized } = buildEnv(() =>
      Promise.reject('oops')
    );
    await handler(req, {});
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'Invalid token');
  });

  test('sends forbidden when the decoded token is not an admin', async () => {
    const sendUnauthorized = jest.fn();
    const sendForbidden = jest.fn();
    const handler = createVerifyAdmin({
      verifyToken: () => Promise.resolve({ uid: 'user-123' }),
      isAdminUid: () => false,
      sendUnauthorized,
      sendForbidden,
    });

    await handler(req, {});

    expect(sendUnauthorized).not.toHaveBeenCalled();
    expect(sendForbidden).toHaveBeenCalledWith({});
  });

  test('falls back to an id_token body field when Authorization is absent', async () => {
    const verifyToken = jest.fn().mockResolvedValue({ uid: 'user-123' });
    const { handler, sendUnauthorized, sendForbidden } = buildEnv(verifyToken);

    await handler(
      {
        get: () => null,
        body: { id_token: 'body-token' },
      },
      {}
    );

    expect(verifyToken).toHaveBeenCalledWith('body-token');
    expect(sendUnauthorized).not.toHaveBeenCalled();
    expect(sendForbidden).not.toHaveBeenCalled();
  });

  test('ignores a non-string id_token body field when Authorization is absent', async () => {
    const verifyToken = jest.fn().mockResolvedValue({ uid: 'user-123' });
    const { handler, sendUnauthorized, sendForbidden } = buildEnv(verifyToken);

    await handler(
      {
        get: () => null,
        body: { id_token: 42 },
      },
      {}
    );

    expect(verifyToken).not.toHaveBeenCalled();
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'Missing token');
    expect(sendForbidden).not.toHaveBeenCalled();
  });

  test('resolveErrorMessageWithDefault returns provided string', () => {
    expect(cloudCoreTestUtils.resolveErrorMessageWithDefault('boom')).toBe(
      'boom'
    );
  });

  test('resolveErrorMessageWithDefault returns default for empty string message', () => {
    expect(cloudCoreTestUtils.resolveErrorMessageWithDefault('')).toBe(
      'Invalid token'
    );
  });

  test('resolveErrorMessageWithDefault returns default for non-string message', () => {
    expect(cloudCoreTestUtils.resolveErrorMessageWithDefault(42)).toBe(
      'Invalid token'
    );
  });
});
