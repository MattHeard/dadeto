import { describe, expect, it } from '@jest/globals';
import { plusOneAnnotatorToy } from '../../../src/core/browser/toys/2026-02-19/plusOneAnnotator.js';

const env = new Map();

/**
 * Run the toy with a structured input object and parse the JSON output.
 * @param {{ sentence: string, knownWords: string }} input - Toy input fields.
 * @returns {Record<string, unknown>} Parsed toy output.
 */
function runToy(input) {
  return JSON.parse(plusOneAnnotatorToy(JSON.stringify(input), env));
}

describe('plusOneAnnotatorToy', () => {
  it('returns isPlusOne true when exactly one token is unknown', () => {
    const result = runToy({ sentence: 'Ich gehe nach Hause', knownWords: 'ich\ngehe\nnach' });

    expect(result.unknownCount).toBe(1);
    expect(result.unknownTokens).toEqual(['hause']);
    expect(result.isPlusOne).toBe(true);
  });

  it('returns isPlusOne false when all tokens are known', () => {
    const result = runToy({ sentence: 'Ich gehe', knownWords: 'ich\ngehe' });

    expect(result.unknownCount).toBe(0);
    expect(result.isPlusOne).toBe(false);
  });

  it('returns isPlusOne false when two tokens are unknown', () => {
    const result = runToy({ sentence: 'Ich lerne Deutsch', knownWords: 'ich' });

    expect(result.unknownCount).toBe(2);
    expect(result.isPlusOne).toBe(false);
  });

  it('handles umlauts and ß correctly', () => {
    const result = runToy({
      sentence: 'Die Häuser sind schön',
      knownWords: 'die\nhäuser\nsind',
    });

    expect(result.unknownTokens).toEqual(['schön']);
  });

  it('strips punctuation before checking known words', () => {
    const result = runToy({ sentence: 'Hallo, Welt!', knownWords: 'hallo\nwelt' });

    expect(result.unknownCount).toBe(0);
  });

  it('returns error for invalid input', () => {
    const actual = plusOneAnnotatorToy('not json', env);
    expect(actual).toContain('error');
  });

  it('handles empty sentence', () => {
    const result = runToy({ sentence: '', knownWords: 'ich\ngehe' });

    expect(result.tokens).toEqual([]);
    expect(result.unknownCount).toBe(0);
  });
});
