import { describe, test, expect, jest } from '@jest/globals';
import { assertFunction } from '../../../src/core/commonCore.js';
import {
  getHeaderFromGetter,
  normalizeString,
  normalizeContent,
  normalizeAuthor,
  productionOrigins,
  resolveAllowedOrigins,
  whenBodyPresent,
  getSnapshotData,
  isDuplicateAppError,
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
  describe('resolveAllowedOrigins', () => {
    test('returns production origins for prod env', () => {
      const result = resolveAllowedOrigins({ DENDRITE_ENVIRONMENT: 'prod' });
      expect(result).toEqual(productionOrigins);
    });

    test('uses PLAYWRIGHT_ORIGIN when in test env', () => {
      const result = resolveAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-firefox',
        PLAYWRIGHT_ORIGIN: 'https://playwright.test',
      });
      expect(result).toEqual(['https://playwright.test']);
    });

    test('returns empty array when test env is missing PLAYWRIGHT_ORIGIN', () => {
      const result = resolveAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-firefox',
      });
      expect(result).toEqual([]);
    });

    test('throws when environment is unsupported', () => {
      expect(() =>
        resolveAllowedOrigins({ DENDRITE_ENVIRONMENT: 'stage' })
      ).toThrow(/Unsupported environment label/);
    });
  });

  describe('normalizeContent', () => {
    test('normalizes newlines and truncates text to max length', () => {
      const raw = 'line1\r\nline2\rline3';

      expect(normalizeContent(raw, 100)).toBe('line1\nline2\nline3');
      expect(normalizeContent(raw, 5)).toBe('line1');
    });

    test('defaults to an empty string when the value is nullish', () => {
      expect(normalizeContent(null, 10)).toBe('');
      expect(normalizeContent(undefined, 10)).toBe('');
    });
  });

  describe('normalizeAuthor', () => {
    test('trims and enforces maximum length', () => {
      expect(normalizeAuthor('  author  ')).toBe('author');
      expect(normalizeAuthor('long author')).toBe('long author');
    });

    test('handles nullish values by returning an empty string', () => {
      expect(normalizeAuthor(null)).toBe('');
      expect(normalizeAuthor(undefined)).toBe('');
    });
  });

  describe('getHeaderFromGetter', () => {
    test('returns null when the getter is not callable', () => {
      expect(getHeaderFromGetter(undefined, 'Authorization')).toBeNull();
    });
  });

  describe('whenBodyPresent', () => {
    test('returns false when body is missing', () => {
      const evaluator = jest.fn(() => true);
      expect(whenBodyPresent(null, evaluator)).toBe(false);
      expect(evaluator).not.toHaveBeenCalled();
    });

    test('invokes the evaluator when the body exists', () => {
      const evaluator = jest.fn(() => 'ok');
      expect(whenBodyPresent({ payload: true }, evaluator)).toBe('ok');
      expect(evaluator).toHaveBeenCalledWith({ payload: true });
    });
  });

  describe('getSnapshotData', () => {
    test('returns null when snapshot lacks data helper', () => {
      expect(getSnapshotData({})).toBeNull();
    });

    test('returns the snapshot data when available', () => {
      const value = { foo: 'bar' };
      expect(getSnapshotData({ data: () => value })).toBe(value);
    });
  });

  describe('isDuplicateAppError', () => {
    test('requires a duplicate message to return true even when code matches', () => {
      expect(
        isDuplicateAppError({
          code: 'app/duplicate-app',
        })
      ).toBe(false);
    });

    test('recognizes duplicate app errors by message content', () => {
      expect(
        isDuplicateAppError({
          message: 'Firebase app already exists in this project',
        })
      ).toBe(true);
    });

    test('returns false for other errors', () => {
      expect(isDuplicateAppError({ code: 'something/else' })).toBe(false);
      expect(isDuplicateAppError(null)).toBe(false);
    });
  });
});
