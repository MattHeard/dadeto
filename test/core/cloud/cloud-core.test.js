import { describe, test, expect, jest } from '@jest/globals';
import {
  DEFAULT_BUCKET_NAME,
  assertFunction,
  createCorsOptionsValue,
  buildErrorResult,
  classifyDeploymentEnvironment,
  normalizeValueWithLimit,
  getHeaderFromGetter,
  getNumericValueOrZero,
  normalizeString,
  normalizeContent,
  normalizeAuthor,
  normalizeNonStringCandidate,
  getAuthHeader,
  normalizeStaticObjectPrefix,
  prefixStaticObjectPath,
  productionOrigins,
  returnErrorResultOrValue,
  resolveAllowedOrigins,
  resolveStaticBucketName,
  resolveStaticObjectPrefix,
  whenBodyPresent,
  getSnapshotData,
  isDuplicateAppError,
  stringOrNull,
  trimmedStringOrNull,
  whenPredicateValue,
} from '../../../src/core/cloud/cloud-core.js';

describe('cloud-core', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should export DEFAULT_BUCKET_NAME', () => {
    expect(DEFAULT_BUCKET_NAME).toBe('www.dendritestories.co.nz');
  });

  describe('static storage helpers', () => {
    test('resolveStaticBucketName uses env override or fallback', () => {
      expect(
        resolveStaticBucketName({ STATIC_BUCKET_NAME: 'test-bucket' })
      ).toBe('test-bucket');
      expect(resolveStaticBucketName({}, 'fallback-bucket')).toBe(
        'fallback-bucket'
      );
      expect(resolveStaticBucketName({})).toBe(DEFAULT_BUCKET_NAME);
    });

    test('normalizes object prefixes', () => {
      expect(normalizeStaticObjectPrefix('/t-example//')).toBe('t-example/');
      expect(normalizeStaticObjectPrefix('')).toBe('');
      expect(normalizeStaticObjectPrefix(null)).toBe('');
    });

    test('prefixes static object paths without changing root production paths', () => {
      expect(prefixStaticObjectPath('', 'stats.html')).toBe('stats.html');
      expect(prefixStaticObjectPath('t-example', '/p/1.html')).toBe(
        't-example/p/1.html'
      );
      expect(
        resolveStaticObjectPrefix({ STATIC_OBJECT_PREFIX: '/t-example/' })
      ).toBe('t-example/');
    });
  });

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

  describe('string helpers', () => {
    test('stringOrNull returns string values or null', () => {
      expect(stringOrNull('value')).toBe('value');
      expect(stringOrNull(123)).toBeNull();
      expect(stringOrNull(undefined)).toBeNull();
    });

    test('trimmedStringOrNull returns a trimmed string or null', () => {
      expect(trimmedStringOrNull('  hello  ')).toBe('hello');
      expect(trimmedStringOrNull('   ')).toBeNull();
      expect(trimmedStringOrNull(123)).toBeNull();
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

    test('formats unknown environment labels as unknown in classification errors', () => {
      expect(() => classifyDeploymentEnvironment(null)).toThrow(
        'Unsupported environment label: unknown'
      );
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

  describe('normalizeValueWithLimit', () => {
    test('normalizes first and truncates second', () => {
      expect(
        normalizeValueWithLimit('  hello  ', 3, value => String(value).trim())
      ).toBe('hel');
      expect(
        normalizeValueWithLimit(null, 10, value => String(value ?? '').trim())
      ).toBe('');
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

    test('normalizes the returned header when the getter is callable', () => {
      expect(
        getHeaderFromGetter(
          name => (name === 'Authorization' ? 'Bearer token' : null),
          'Authorization'
        )
      ).toBe('Bearer token');
    });
  });

  describe('getAuthHeader', () => {
    test('preserves the request receiver for Express header getters', () => {
      const req = {
        headers: { authorization: 'Bearer bound-token' },
        get(name) {
          return this.headers[name.toLowerCase()];
        },
      };

      expect(getAuthHeader(req)).toBe('Bearer bound-token');
    });

    test('returns an empty string when the request has no headers bag', () => {
      const req = {
        get() {
          return this.headers.authorization;
        },
      };

      expect(getAuthHeader(req)).toBe('');
      expect(getAuthHeader({})).toBe('');
      expect(getAuthHeader()).toBe('');
    });

    test('falls back to the raw headers bag when the getter omits Authorization', () => {
      const req = {
        headers: { authorization: 'Bearer header-token' },
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(getAuthHeader(req)).toBe('Bearer header-token');
    });

    test('handles callable request objects that are not plain objects', () => {
      /**
       *
       */
      function req() {}
      req.get = function get(name) {
        return this.headers[name.toLowerCase()];
      };
      req.headers = { authorization: 'Bearer function-token' };

      expect(getAuthHeader(req)).toBe('');
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

  describe('createCorsOptionsValue', () => {
    test('returns a simple origin and methods object', () => {
      const origin = () => {};
      expect(createCorsOptionsValue(origin)).toEqual({
        origin,
        methods: ['POST'],
      });
      expect(createCorsOptionsValue(origin, ['GET'])).toEqual({
        origin,
        methods: ['GET'],
      });
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

  describe('whenPredicateValue', () => {
    test('returns the original value when predicate accepts it', () => {
      expect(whenPredicateValue('hello', value => value.length > 2)).toBe(
        'hello'
      );
      expect(whenPredicateValue('hi', value => value.length > 2)).toBeNull();
    });
  });

  describe('error and numeric helpers', () => {
    test('wraps truthy errors and falls back when no error is present', () => {
      expect(buildErrorResult('boom')).toEqual({ error: 'boom' });
      expect(buildErrorResult('')).toBeNull();
      expect(returnErrorResultOrValue('boom', () => 'ok')).toEqual({
        error: 'boom',
      });
      expect(returnErrorResultOrValue(null, () => 'ok')).toBe('ok');
    });

    test('normalizes optional numeric selector values', () => {
      expect(getNumericValueOrZero(null, value => value.count)).toBe(0);
      expect(getNumericValueOrZero({ count: 7 }, value => value.count)).toBe(7);
      expect(getNumericValueOrZero({ count: 'x' }, value => value.count)).toBe(
        0
      );
    });

    test('normalizes non-string authorization candidates', () => {
      expect(normalizeNonStringCandidate(['Bearer token'])).toBe(
        'Bearer token'
      );
      expect(normalizeNonStringCandidate([123])).toBeNull();
      expect(normalizeNonStringCandidate(123)).toBeNull();
    });
  });
});
