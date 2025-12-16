import { describe, test, expect } from '@jest/globals';
import {
  safeParseJson,
  parseJsonOrDefault,
  valueOr,
} from '../../src/core/browser/browser-core.js';

const parseJsonValue = x => JSON.parse(x);

describe('safeParseJson', () => {
  test('parses valid JSON strings', () => {
    expect(safeParseJson('{"a":1}', parseJsonValue)).toEqual({ a: 1 });
  });

  test('returns undefined for invalid JSON', () => {
    expect(safeParseJson('invalid', parseJsonValue)).toBeUndefined();
  });
});

describe('valueOr', () => {
  test('returns the fallback when value is undefined', () => {
    expect(valueOr(undefined, 'fallback')).toBe('fallback');
  });

  test('returns the provided value when defined', () => {
    expect(valueOr('value', 'fallback')).toBe('value');
  });
});

describe('parseJsonOrDefault', () => {
  test('returns parsed JSON when valid', () => {
    expect(parseJsonOrDefault('{"b":2}', { b: 0 })).toEqual({ b: 2 });
  });

  test('returns fallback when JSON is invalid', () => {
    const fallback = { c: 3 };
    expect(parseJsonOrDefault('bad', fallback)).toBe(fallback);
  });

  test('uses the default fallback when not provided', () => {
    expect(parseJsonOrDefault('bad')).toEqual({});
  });
});
