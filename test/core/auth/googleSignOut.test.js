import { jest } from '@jest/globals';
import { createGoogleSignOut } from '../../../src/core/browser/browser-core.js';

describe('createGoogleSignOut', () => {
  it('signs out, clears the token, and disables auto select', async () => {
    const authSignOut = jest.fn().mockResolvedValue();
    const storage = { removeItem: jest.fn() };
    const disableAutoSelect = jest.fn();

    const signOut = createGoogleSignOut({
      authSignOut,
      storage,
      disableAutoSelect,
    });

    await signOut();

    expect(authSignOut).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith('id_token');
    expect(disableAutoSelect).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from authSignOut', async () => {
    const error = new Error('boom');
    const authSignOut = jest.fn().mockRejectedValue(error);
    const storage = { removeItem: jest.fn() };
    const disableAutoSelect = jest.fn();

    const signOut = createGoogleSignOut({
      authSignOut,
      storage,
      disableAutoSelect,
    });

    await expect(signOut()).rejects.toThrow(error);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(disableAutoSelect).not.toHaveBeenCalled();
  });
});
