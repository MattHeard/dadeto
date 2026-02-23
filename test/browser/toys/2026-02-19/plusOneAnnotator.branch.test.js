import { plusOneAnnotatorToy } from '../../../../src/core/browser/toys/2026-02-19/plusOneAnnotator.js';

describe('plusOneAnnotator fallback handling', () => {
  test('reports invalid input when parsing fails', () => {
    const result = plusOneAnnotatorToy(null, new Map());
    expect(result).toContain('Invalid input');
  });

  test('handles empty known words gracefully', () => {
    const payload = JSON.stringify({ sentence: 'Hallo', knownWords: '' });
    const parsed = JSON.parse(plusOneAnnotatorToy(payload, new Map()));
    expect(parsed.tokens).toContain('hallo');
    expect(parsed.unknownCount).toBe(parsed.tokens.length);
  });

  test('ignores known words that normalize to empty strings', () => {
    const payload = JSON.stringify({ sentence: 'Hallo', knownWords: '!!!' });
    const parsed = JSON.parse(plusOneAnnotatorToy(payload, new Map()));
    expect(parsed.unknownTokens).toContain('hallo');
  });

  test('handles missing sentence field gracefully', () => {
    const payload = JSON.stringify({ knownWords: 'test' });
    const parsed = JSON.parse(plusOneAnnotatorToy(payload, new Map()));
    expect(parsed.tokens).toEqual([]);
  });
});
