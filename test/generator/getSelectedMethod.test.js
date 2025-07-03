import { describe, test, expect } from '@jest/globals';
import { getSelectedMethod } from '../../src/generator/generator.js';

describe('getSelectedMethod', () => {
  test('returns undefined when default is text', () => {
    expect(getSelectedMethod('text')).toBeUndefined();
  });

  test('returns the default method when not text', () => {
    expect(getSelectedMethod('number')).toBe('number');
  });
});
