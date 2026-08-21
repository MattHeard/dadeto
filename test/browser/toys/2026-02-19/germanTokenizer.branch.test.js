import {
  germanTokenizerToy,
  normalizeText,
  normalizeToken,
} from '../../../../src/core/browser/toys/2026-02-19/germanTokenizer.js';

describe('germanTokenizer helper fallbacks', () => {
  test('normalizeText returns empty string when input is not a string', () => {
    expect(normalizeText(42)).toBe('');
  });

  test('normalizeText collapses a run of whitespace to one space', () => {
    expect(normalizeText('a     b')).toBe('a b');
  });

  test('normalizeToken returns empty string when token is missing', () => {
    expect(normalizeToken({})).toBe('');
  });

  test('germanTokenizerToy turns non-string input into an empty array', () => {
    expect(germanTokenizerToy(undefined, new Map())).toBe('[]');
    expect(germanTokenizerToy(42, new Map())).toBe('[]');
  });
});
