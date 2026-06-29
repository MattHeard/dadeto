import {
  analyzeText,
  analyzeTitle,
  averageWordsPerSentence,
  countSentences,
  countWords,
  findLongestSentence,
  generateFeedback,
} from '../../../src/core/build/textUtils.js';

describe('textUtils', () => {
  describe('countWords', () => {
    it('returns 0 for invalid or blank input', () => {
      expect(countWords()).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords(42)).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('counts trimmed whitespace-separated words', () => {
      expect(countWords(' one   two three ')).toBe(3);
    });
  });

  describe('countSentences', () => {
    it('returns 0 for invalid or punctuation-free input', () => {
      expect(countSentences()).toBe(0);
      expect(countSentences(null)).toBe(0);
      expect(countSentences('No ending punctuation')).toBe(0);
    });

    it('counts sentence terminators', () => {
      expect(countSentences('One. Two! Three?')).toBe(3);
    });
  });

  describe('averageWordsPerSentence', () => {
    it('returns 0 when there are no sentences', () => {
      expect(averageWordsPerSentence('No terminator here')).toBe(0);
    });

    it('computes the average from the sentence count', () => {
      expect(averageWordsPerSentence('One two. Three four five.')).toBe(2.5);
    });
  });

  describe('findLongestSentence', () => {
    it('returns the empty result for invalid or empty input', () => {
      expect(findLongestSentence()).toEqual({ sentence: '', wordCount: 0 });
      expect(findLongestSentence(' . ! ? ')).toEqual({
        sentence: '',
        wordCount: 0,
      });
    });

    it('returns the longest trimmed sentence', () => {
      expect(
        findLongestSentence('Short. The longest sentence here. Tiny!')
      ).toEqual({
        sentence: 'The longest sentence here',
        wordCount: 4,
      });
    });
  });

  describe('analyzeText', () => {
    it('summarizes the text and rounds the average words per sentence', () => {
      expect(analyzeText('One two. Three four five.')).toEqual({
        wordCount: 5,
        sentenceCount: 2,
        avgWordsPerSentence: 2.5,
        longestSentence: { sentence: 'Three four five', wordCount: 3 },
        target: 100,
        delta: -95,
        isExactly100: false,
      });
    });
  });

  describe('generateFeedback', () => {
    it('covers under, over, exact, long, short, and longest-sentence branches', () => {
      expect(
        generateFeedback({
          isExactly100: true,
          delta: 0,
          avgWordsPerSentence: 3,
          sentenceCount: 4,
          longestSentence: { sentence: 'x', wordCount: 31 },
        })
      ).toEqual([
        'Exactly 100 words! Ready for a title.',
        'Sentences are short (avg 3 words). Consider combining some.',
        'Longest sentence is 31 words. Might be hard to follow.',
      ]);

      expect(
        generateFeedback({
          isExactly100: false,
          delta: 2,
          avgWordsPerSentence: 30,
          sentenceCount: 1,
          longestSentence: { sentence: 'x', wordCount: 10 },
        })
      ).toEqual([
        '2 words over. Cut 2 words.',
        'Sentences are long (avg 30 words). Consider breaking some up.',
      ]);

      expect(
        generateFeedback({
          isExactly100: false,
          delta: 1,
          avgWordsPerSentence: 12,
          sentenceCount: 2,
          longestSentence: { sentence: 'x', wordCount: 10 },
        })
      ).toEqual(['1 word over. Cut 1 word.']);

      expect(
        generateFeedback({
          isExactly100: false,
          delta: -1,
          avgWordsPerSentence: 10,
          sentenceCount: 2,
          longestSentence: { sentence: 'x', wordCount: 1 },
        })
      ).toEqual(['1 word under. Add 1 word.']);

      expect(
        generateFeedback({
          isExactly100: false,
          delta: -2,
          avgWordsPerSentence: 10,
          sentenceCount: 2,
          longestSentence: { sentence: 'x', wordCount: 1 },
        })
      ).toEqual(['2 words under. Add 2 words.']);
    });
  });

  describe('analyzeTitle', () => {
    it('checks for a three-word title', () => {
      expect(analyzeTitle('One two three')).toEqual({
        wordCount: 3,
        isValid: true,
      });
      expect(analyzeTitle('One two')).toEqual({ wordCount: 2, isValid: false });
    });
  });
});
