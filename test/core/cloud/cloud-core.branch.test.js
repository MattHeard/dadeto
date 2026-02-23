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
    const { handler, sendUnauthorized } = buildEnv(() => Promise.reject('oops'));
    await handler(req, {});
    expect(sendUnauthorized).toHaveBeenCalledWith({}, 'Invalid token');
  });

  test('resolveErrorMessageWithDefault returns provided string', () => {
    expect(cloudCoreTestUtils.resolveErrorMessageWithDefault('boom')).toBe('boom');
  });

  test('resolveErrorMessageWithDefault returns default for empty string message', () => {
    expect(cloudCoreTestUtils.resolveErrorMessageWithDefault('')).toBe('Invalid token');
  });
});
