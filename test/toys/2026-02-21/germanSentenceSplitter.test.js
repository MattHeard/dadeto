import { describe, test, expect } from '@jest/globals';
import { germanSentenceSplitterToy } from '../../../src/core/browser/toys/2026-02-21/germanSentenceSplitter.js';

describe('germanSentenceSplitterToy', () => {
  test('returns empty array for empty string input', () => {
    expect(germanSentenceSplitterToy('', new Map())).toBe(JSON.stringify([]));
  });

  test('returns empty array for whitespace-only input', () => {
    expect(germanSentenceSplitterToy('   ', new Map())).toBe(
      JSON.stringify([])
    );
  });

  test('returns empty array for non-string input', () => {
    expect(germanSentenceSplitterToy(42, new Map())).toBe(JSON.stringify([]));
  });

  test('splits simple German sentences', () => {
    const input = 'Das ist ein Satz. Das ist ein anderer Satz.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual([
      'Das ist ein Satz.',
      'Das ist ein anderer Satz.',
    ]);
  });

  test('splits on exclamation and question marks', () => {
    const input = 'Wie geht es dir? Gut, danke! Prima.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result.length).toBe(3);
    expect(result[0]).toBe('Wie geht es dir?');
  });

  test('does not split on known abbreviations', () => {
    const input = 'Er wohnt in der Berliner Str. Das stimmt.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result.length).toBe(1);
    expect(result[0]).toContain('Str.');
  });

  test('returns single sentence when no boundary found', () => {
    const input = 'Ein einzelner Satz ohne Ende';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual(['Ein einzelner Satz ohne Ende']);
  });
});
