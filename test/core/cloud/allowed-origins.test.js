import { describe, expect, jest, test } from '@jest/globals';
import { getAllowedOrigins } from '../../../src/core/cloud/allowed-origins.js';

describe('allowed-origins wrapper', () => {
  test('forwards to the cloud core origin resolver', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const logDebug = jest.fn();
    expect(
      getAllowedOrigins(
        allowEffects,
        {
          DENDRITE_ENVIRONMENT: 'prod',
        },
        logDebug
      )
    ).toEqual([
      'https://mattheard.net',
      'https://dendritestories.co.nz',
      'https://www.dendritestories.co.nz',
    ]);
    expect(logDebug).toHaveBeenCalledWith(
      allowEffects,
      'resolveAllowedOrigins environment',
      { DENDRITE_ENVIRONMENT: 'prod' }
    );
  });
});
