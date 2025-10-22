import { describe, test, expect } from '@jest/globals';
import { defaultKeyExtraClasses } from '../../src/build/generator.js';

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

  test('mutates the original object when property is missing', () => {
    const args = {};
    const returned = defaultKeyExtraClasses(args);
    expect(returned).toBe(args);
    expect(args.keyExtraClasses).toBe('');
  });
});
