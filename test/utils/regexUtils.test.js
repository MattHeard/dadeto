import { describe, test, expect } from '@jest/globals';
import {
  escapeRegex,
  createPattern,
  matchesPattern,
} from '../../src/core/regexUtils.js';

describe('escapeRegex', () => {
  test('escapes special regex characters', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe(
      '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
    );
  });

  test('returns empty string for non-string input', () => {
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex(123)).toBe('');
    expect(escapeRegex({})).toBe('');
  });

  test('returns the same string when no special characters', () => {
    expect(escapeRegex('test')).toBe('test');
    expect(escapeRegex('hello-world')).toBe('hello\\-world');
  });
});

describe('createPattern', () => {
  test('creates a pattern with default flags', () => {
    const pattern = createPattern('*');
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern.flags).toBe('g');
    expect('*test*'.match(pattern)?.[0]).toBe('*test*');
  });

  test('creates a pattern with custom flags', () => {
    const pattern = createPattern('*', { flags: 'i' });
    expect(pattern.flags).toBe('i');
    expect('*TEST*'.match(pattern)?.[0]).toBe('*TEST*');
  });

  test('captures content between markers', () => {
    const pattern = createPattern('*');
    const match = pattern.exec('*hello*');
    expect(match?.[1]).toBe('hello');
  });

  test('handles special characters in the marker', () => {
    const pattern = createPattern('*+?');
    expect('*+?test*+?'.match(pattern)?.[0]).toBe('*+?test*+?');
  });

  test('creates a pattern for double markers', () => {
    const pattern = createPattern('*', { isDouble: true });
    expect('**test**'.match(pattern)?.[0]).toBe('**test**');
    expect('*test*'.match(pattern)).toBeNull();
  });

  test('captures content between double markers', () => {
    const pattern = createPattern('*', { isDouble: true });
    const match = pattern.exec('**value**');
    expect(match?.[1]).toBe('value');
  });
});

describe('matchesPattern', () => {
  test('returns true when string matches pattern', () => {
    const pattern = /test/;
    expect(matchesPattern('this is a test', pattern)).toBe(true);
    expect(matchesPattern('test', pattern)).toBe(true);
  });

  test('returns false when string does not match pattern', () => {
    const pattern = /test/;
    expect(matchesPattern('no match', pattern)).toBe(false);
    expect(matchesPattern('', pattern)).toBe(false);
  });

  test('handles null/undefined input', () => {
    const pattern = /test/;
    expect(matchesPattern(null, pattern)).toBe(false);
    expect(matchesPattern(undefined, pattern)).toBe(false);
  });
});
