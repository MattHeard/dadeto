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
    expect(result).toEqual(['Das ist ein Satz.', 'Das ist ein anderer Satz.']);
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

  test('protects and restores multiple abbreviation forms', () => {
    const input = 'Dr. Müller kommt. Er arbeitet u.a. hier.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual(['Dr. Müller kommt.', 'Er arbeitet u.a. hier.']);
  });

  test('protects repeated abbreviations globally', () => {
    const input = 'Er kommt z.B. heute. Das gilt u.a. morgen. Er sagt z.B. ja.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual([
      'Er kommt z.B. heute.',
      'Das gilt u.a. morgen.',
      'Er sagt z.B. ja.',
    ]);
  });

  test('protects abbreviations before uppercase words', () => {
    const input = 'Er nutzt z.B. Heute. Danach u.a. Morgen.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual(['Er nutzt z.B. Heute.', 'Danach u.a. Morgen.']);
  });

  test('protects every repeated abbreviation and restores every placeholder', () => {
    const input = 'Er nutzt z.B. Heute und z.B. Morgen. Danach u.a. heute u.a. morgen.';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual([
      'Er nutzt z.B. Heute und z.B. Morgen.',
      'Danach u.a. heute u.a. morgen.',
    ]);
  });

  test('trims surrounding whitespace and collapses internal whitespace', () => {
    const input = '  Das   ist ein Satz.   Noch einer.  ';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual(['Das ist ein Satz.', 'Noch einer.']);
  });

  test('returns single sentence when no boundary found', () => {
    const input = 'Ein einzelner Satz ohne Ende';
    const result = JSON.parse(germanSentenceSplitterToy(input, new Map()));
    expect(result).toEqual(['Ein einzelner Satz ohne Ende']);
  });
});
