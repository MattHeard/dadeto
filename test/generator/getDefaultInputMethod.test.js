import { describe, test, expect } from '@jest/globals';
import { getDefaultInputMethod } from '../../src/generator/generator.js';

describe('getDefaultInputMethod', () => {
  test('returns the toy default when provided', () => {
    const post = { toy: { defaultInputMethod: 'number' } };
    expect(getDefaultInputMethod(post)).toBe('number');
  });

  test('falls back to text when toy is missing', () => {
    const post = {};
    expect(getDefaultInputMethod(post)).toBe('text');
  });
});
