import { jest } from '@jest/globals';
import {
  ensureGoogleIdentityAvailable,
  hasRequiredGoogleIdentityMethods,
  reportMissingGoogleIdentity,
} from '../../../src/core/browser/admin-core.js';

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

describe('Google Identity interface helpers', () => {
  it('requires both initialization and button-rendering methods', () => {
    expect(hasRequiredGoogleIdentityMethods({ initialize: jest.fn(), renderButton: jest.fn() })).toBe(true);
    expect(hasRequiredGoogleIdentityMethods({ initialize: jest.fn() })).toBe(false);
    expect(hasRequiredGoogleIdentityMethods({ renderButton: jest.fn() })).toBe(false);
    expect(hasRequiredGoogleIdentityMethods(null)).toBe(false);
  });

  it('reports through a safe logger even when no logger is supplied', () => {
    const logger = { error: jest.fn() };
    reportMissingGoogleIdentity(logger);
    expect(logger.error).toHaveBeenCalledWith('Google Identity script missing');
    expect(() => reportMissingGoogleIdentity(undefined)).not.toThrow();
  });
});
