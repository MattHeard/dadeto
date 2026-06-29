import { describe, expect, test } from '@jest/globals';
import { getAllowedOrigins } from '../../../src/core/cloud/allowed-origins.js';

describe('allowed-origins wrapper', () => {
  test('forwards to the cloud core origin resolver', () => {
    expect(
      getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 'prod',
      })
    ).toEqual([
      'https://mattheard.net',
      'https://dendritestories.co.nz',
      'https://www.dendritestories.co.nz',
    ]);
  });
});
