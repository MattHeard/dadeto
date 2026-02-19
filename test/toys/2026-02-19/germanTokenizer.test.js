import { describe, expect, it } from '@jest/globals';
import {
  germanTokenizerToy,
  normalizeText,
  normalizeToken,
} from '../../../src/core/browser/toys/2026-02-19/germanTokenizer.js';

describe('normalizeToken', () => {
  it('strips trailing comma and lowercases', () => {
    expect(normalizeToken('Häuser,')).toMatchInlineSnapshot('"häuser"');
  });

  it('lowercases ß correctly', () => {
    expect(normalizeToken('Straße')).toMatchInlineSnapshot('"straße"');
  });

  it('strips surrounding parentheses and exclamation mark', () => {
    expect(normalizeToken(' (Hallo!) ')).toMatchInlineSnapshot('"hallo"');
  });

  it('preserves internal hyphens', () => {
    expect(normalizeToken('gut-gemeint')).toMatchInlineSnapshot('"gut-gemeint"');
  });
});

describe('normalizeText', () => {
  it('lowercases and collapses internal whitespace', () => {
    expect(normalizeText('  Das   ist  Text  ')).toBe('das ist text');
  });
});

describe('germanTokenizerToy', () => {
  it('tokenizes and normalizes a German sentence', () => {
    expect(germanTokenizerToy('Ich gehe heute nach Hause.', new Map())).toBe(
      '["ich","gehe","heute","nach","hause"]'
    );
  });

  it('strips quotes and commas from tokens', () => {
    expect(germanTokenizerToy('Heute, "Hallo" Welt', new Map())).toBe(
      '["heute","hallo","welt"]'
    );
  });

  it('returns an empty array for empty input', () => {
    expect(germanTokenizerToy('', new Map())).toBe('[]');
  });
});
