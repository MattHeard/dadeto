import { jest } from '@jest/globals';
import { createRegenerateVariant } from '../../../../src/core/browser/admin/core.js';

describe('createRegenerateVariant additional branches', () => {
  const markVariantDirtyUrl = 'https://example.com/variant';

  it('handles null input', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const doc = { getElementById: jest.fn().mockReturnValue(null) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant(
      googleAuth,
      doc,
      showMessage,
      getAdminEndpoints,
      fetch
    );

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
  });

  it('handles non-string input value', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: 123 };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant(
      googleAuth,
      doc,
      showMessage,
      getAdminEndpoints,
      fetch
    );

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
  });

  it('handles invalid format', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: 'invalid' };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant(
      googleAuth,
      doc,
      showMessage,
      getAdminEndpoints,
      fetch
    );

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
  });
});
