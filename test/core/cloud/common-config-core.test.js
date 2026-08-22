import { describe, expect, test } from '@jest/globals';
import { ensureString } from '../../../src/core/cloud/common-config-core.js';

describe('common configuration core', () => {
  test('normalizes strings and non-strings through the shared helper', () => {
    expect(ensureString('configured')).toBe('configured');
    expect(ensureString(undefined)).toBe('');
    expect(ensureString(null)).toBe('');
  });
});
