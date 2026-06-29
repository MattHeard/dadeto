import { describe, expect, test, jest } from '@jest/globals';
import {
  resolveAuthorIdFromHeader,
  verifyTokenSafe,
} from '../../../src/core/cloud/auth-helpers.js';

describe('auth-helpers', () => {
  test('verifies tokens and maps decoded payloads', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1' });

    await expect(verifyTokenSafe('token', verifyIdToken)).resolves.toBe(
      'user-1'
    );

    expect(verifyIdToken).toHaveBeenCalledWith('token');
  });

  test('returns null when token verification fails', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('bad'));

    await expect(
      verifyTokenSafe('token', verifyIdToken, () => 'ignored')
    ).resolves.toBeNull();
  });

  test('uses the default UID mapper when no mapper is provided', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-3' });

    await expect(verifyTokenSafe('token', verifyIdToken)).resolves.toBe(
      'user-3'
    );
  });

  test('resolves an author id from a bearer authorization header', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-2' });

    await expect(
      resolveAuthorIdFromHeader('Bearer token-value', verifyIdToken)
    ).resolves.toBe('user-2');

    expect(verifyIdToken).toHaveBeenCalledWith('token-value');
  });

  test('returns null when the authorization header is missing or invalid', async () => {
    const verifyIdToken = jest.fn();

    await expect(
      resolveAuthorIdFromHeader('', verifyIdToken)
    ).resolves.toBeNull();
    await expect(
      resolveAuthorIdFromHeader(123, verifyIdToken)
    ).resolves.toBeNull();
    await expect(
      resolveAuthorIdFromHeader('Basic token-value', verifyIdToken)
    ).resolves.toBeNull();

    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
