import { describe, test, expect } from '@jest/globals';
import {
  assertFunction,
  normalizeString,
} from '../../../src/core/cloud/cloud-core.js';

describe('cloud-core', () => {
  describe('assertFunction', () => {
    test('should not throw an error if the candidate is a function', () => {
      expect(() => assertFunction(() => {}, 'test')).not.toThrow();
    });

    test('should throw a TypeError if the candidate is not a function', () => {
      expect(() => assertFunction(null, 'test')).toThrow(TypeError);
      expect(() => assertFunction(undefined, 'test')).toThrow(TypeError);
      expect(() => assertFunction(1, 'test')).toThrow(TypeError);
      expect(() => assertFunction('test', 'test')).toThrow(TypeError);
      expect(() => assertFunction({}, 'test')).toThrow(TypeError);
    });
  });

  describe('normalizeString', () => {
    test('should trim whitespace from the beginning and end of a string', () => {
      expect(normalizeString('  test  ', 10)).toBe('test');
    });

    test('should truncate a string to the specified maxLength', () => {
      expect(normalizeString('1234567890', 5)).toBe('12345');
    });

    test('should handle null and undefined values by returning an empty string', () => {
      expect(normalizeString(null, 10)).toBe('');
      expect(normalizeString(undefined, 10)).toBe('');
    });

    test('should convert non-string values to a string', () => {
      expect(normalizeString(123, 10)).toBe('123');
      expect(normalizeString({ a: 1 }, 10)).toBe('[object Ob');
    });
  });
});
