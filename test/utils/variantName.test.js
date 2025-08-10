import { describe, test, expect } from '@jest/globals';
import { incrementVariantName } from '../../infra/variantName.js';

describe('incrementVariantName', () => {
  test('increments single letter', () => {
    expect(incrementVariantName('a')).toBe('b');
  });

  test('wraps z to aa', () => {
    expect(incrementVariantName('z')).toBe('aa');
  });

  test('increments multi-letter name', () => {
    expect(incrementVariantName('az')).toBe('ba');
    expect(incrementVariantName('zz')).toBe('aaa');
    expect(incrementVariantName('zzzzz')).toBe('aaaaaa');
  });
});
