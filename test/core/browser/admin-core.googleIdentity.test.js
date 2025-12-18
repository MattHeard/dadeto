import { jest } from '@jest/globals';
import { ensureGoogleIdentityAvailable } from '../../../src/core/browser/admin-core.js';

describe('ensureGoogleIdentityAvailable', () => {
  it('reports an error when the client lacks required methods', () => {
    const logger = { error: jest.fn() };

    expect(ensureGoogleIdentityAvailable({}, logger)).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('Google Identity script missing');
  });

  it('accepts clients exposing initialize and renderButton', () => {
    const accountsId = {
      initialize: jest.fn(),
      renderButton: jest.fn(),
    };

    expect(ensureGoogleIdentityAvailable(accountsId)).toBe(true);
  });
});
