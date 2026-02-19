import { describe, it, expect } from '@jest/globals';
import { coerceValue } from '../../src/browser/toys.js';

describe('coerceValue', () => {
  describe('type: string (default)', () => {
    it('returns the raw string unchanged', () => {
      expect(coerceValue('hello', 'string')).toBe('hello');
    });

    it('returns empty string unchanged', () => {
      expect(coerceValue('', 'string')).toBe('');
    });

    it('returns raw string for unknown type', () => {
      expect(coerceValue('42', 'unknown')).toBe('42');
    });
  });

  describe('type: number', () => {
    it('parses an integer string to a number', () => {
      expect(coerceValue('42', 'number')).toBe(42);
    });

    it('parses a float string to a number', () => {
      expect(coerceValue('3.14', 'number')).toBe(3.14);
    });

    it('returns null for non-numeric input', () => {
      expect(coerceValue('abc', 'number')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(coerceValue('', 'number')).toBeNull();
    });
  });

  describe('type: boolean', () => {
    it('returns true for "true"', () => {
      expect(coerceValue('true', 'boolean')).toBe(true);
    });

    it('returns false for "false"', () => {
      expect(coerceValue('false', 'boolean')).toBe(false);
    });

    it('returns true for uppercase "TRUE"', () => {
      expect(coerceValue('TRUE', 'boolean')).toBe(true);
    });

    it('returns false for any non-"true" string', () => {
      expect(coerceValue('yes', 'boolean')).toBe(false);
    });
  });

  describe('type: json', () => {
    it('parses a JSON object string', () => {
      expect(coerceValue('{"a":1}', 'json')).toEqual({ a: 1 });
    });

    it('parses a JSON array string', () => {
      expect(coerceValue('[1,2,3]', 'json')).toEqual([1, 2, 3]);
    });

    it('returns null for invalid JSON', () => {
      expect(coerceValue('not json', 'json')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(coerceValue('', 'json')).toBeNull();
    });
  });
});
