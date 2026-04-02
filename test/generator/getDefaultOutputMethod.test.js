import { describe, test, expect } from '@jest/globals';
import { getDefaultOutputMethod } from '../../src/build/generator.js';

describe('getDefaultOutputMethod', () => {
  test('returns the toy default output when provided', () => {
    const post = { toy: { defaultOutputMethod: 'ledger-ingest' } };
    expect(getDefaultOutputMethod(post)).toBe('ledger-ingest');
  });

  test('falls back to undefined when no output default exists', () => {
    const post = {};
    expect(getDefaultOutputMethod(post)).toBeUndefined();
  });
});
