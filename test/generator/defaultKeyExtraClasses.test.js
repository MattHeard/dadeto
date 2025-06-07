import { describe, test, expect } from '@jest/globals';
import { defaultKeyExtraClasses } from '../../src/generator/generator.js';

describe('defaultKeyExtraClasses', () => {
  test('initializes undefined property to empty string', () => {
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
  });

  test('preserves provided property', () => {
    const args = { keyExtraClasses: 'existing' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('existing');
  });
});
