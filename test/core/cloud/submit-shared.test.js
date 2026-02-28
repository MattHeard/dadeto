import { describe, expect, test } from '@jest/globals';
import {
  collectSubmissionOptions,
  getAuthorizationFromGetter,
  getAuthorizationFromHeaders,
  getAuthorizationHeader,
} from '../../../src/core/cloud/submit-shared.js';

describe('submit-shared', () => {
  describe('collectSubmissionOptions', () => {
    test('returns normalized non-empty options', () => {
      expect(
        collectSubmissionOptions(
          {
            option0: ' First ',
            option1: '',
            option2: null,
            option3: 'Second',
          },
          120
        )
      ).toEqual(['First', 'Second']);
    });

    test('returns an empty array when body is missing', () => {
      expect(collectSubmissionOptions(undefined, 10)).toEqual([]);
    });

    test('applies the provided max length', () => {
      expect(collectSubmissionOptions({ option0: 'abcdef' }, 3)).toEqual([
        'abc',
      ]);
    });
  });

  describe('getAuthorizationFromGetter', () => {
    test('prefers the canonical Authorization header', () => {
      const getter = name =>
        name === 'Authorization' ? 'Bearer upper' : 'Bearer lower';

      expect(getAuthorizationFromGetter(getter)).toBe('Bearer upper');
    });

    test('falls back to lowercase authorization header', () => {
      const getter = name => (name === 'authorization' ? 'Bearer lower' : null);

      expect(getAuthorizationFromGetter(getter)).toBe('Bearer lower');
    });

    test('returns null when getter is missing', () => {
      expect(getAuthorizationFromGetter(undefined)).toBeNull();
    });
  });

  describe('getAuthorizationFromHeaders', () => {
    test('prefers the canonical Authorization key', () => {
      expect(
        getAuthorizationFromHeaders({
          Authorization: 'Bearer upper',
          authorization: 'Bearer lower',
        })
      ).toBe('Bearer upper');
    });

    test('falls back to lowercase authorization key', () => {
      expect(
        getAuthorizationFromHeaders({
          authorization: 'Bearer lower',
        })
      ).toBe('Bearer lower');
    });

    test('returns null when headers are invalid', () => {
      expect(getAuthorizationFromHeaders(null)).toBeNull();
    });
  });

  describe('getAuthorizationHeader', () => {
    test('prefers getter-based headers over the raw headers bag', () => {
      expect(
        getAuthorizationHeader({
          get: name => (name === 'Authorization' ? 'Bearer getter' : null),
          headers: { Authorization: 'Bearer bag' },
        })
      ).toBe('Bearer getter');
    });

    test('falls back to the raw headers bag', () => {
      expect(
        getAuthorizationHeader({
          headers: { authorization: 'Bearer bag' },
        })
      ).toBe('Bearer bag');
    });

    test('returns null when neither source provides a header', () => {
      expect(
        getAuthorizationHeader({ get: null, headers: undefined })
      ).toBeNull();
    });
  });
});
