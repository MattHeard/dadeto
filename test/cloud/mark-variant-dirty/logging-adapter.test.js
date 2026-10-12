import { expect, it, jest } from '@jest/globals';
import { logWarning } from '../../../src/cloud/mark-variant-dirty/logging-adapter.js';

it('writes warning details using the permission-first cloud adapter', () => {
  const permission = Object.freeze({ scope: 'request' });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    logWarning(permission, 'rejected', { reason: 'invalid' });
    expect(warning).toHaveBeenCalledWith('rejected', { reason: 'invalid' });
  } finally {
    warning.mockRestore();
  }
});
