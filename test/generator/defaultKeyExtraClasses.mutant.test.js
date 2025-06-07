import { describe, it, expect } from '@jest/globals';
import { defaultKeyExtraClasses } from '../../src/generator/generator.js';

describe('defaultKeyExtraClasses mutant', () => {
  it('initializes undefined keyExtraClasses to empty string', () => {
    const result = defaultKeyExtraClasses({});
    expect(result.keyExtraClasses).toBe('');
  });
});
