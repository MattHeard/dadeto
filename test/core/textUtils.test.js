import {
  analyzeText,
  analyzeTitle,
  averageWordsPerSentence,
  countSentences,
  countWords,
  findLongestSentence,
  generateFeedback,
} from '../../src/core/build/textUtils.js';

describe('text utilities', () => {
  it('counts words and sentences across valid and invalid inputs', () => {
    expect(countWords(null)).toBe(0);
    expect(countWords(false)).toBe(0);
    expect(countWords(42)).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords(' one  two\nthree ')).toBe(3);
    expect(countSentences(undefined)).toBe(0);
    expect(countSentences({})).toBe(0);
    expect(countSentences('No ending')).toBe(0);
    expect(countSentences('One! Really?? Yes.')).toBe(3);
    expect(averageWordsPerSentence('One two. Three four.')).toBe(2);
    expect(analyzeText('One two three. Four five.').avgWordsPerSentence).toBe(
      2.5
    );
    expect(averageWordsPerSentence('')).toBe(0);
  });

  it('finds the longest sentence and handles ties and empty text', () => {
    expect(findLongestSentence('')).toEqual({ sentence: '', wordCount: 0 });
    expect(findLongestSentence(123)).toEqual({ sentence: '', wordCount: 0 });
    expect(findLongestSentence('No punctuation here')).toEqual({
      sentence: 'No punctuation here',
      wordCount: 3,
    });
    expect(findLongestSentence('Short. This is longer!')).toEqual({
      sentence: 'This is longer',
      wordCount: 3,
    });
    expect(findLongestSentence('Same size. Equal words.')).toEqual({
      sentence: 'Same size',
      wordCount: 2,
    });
  });

  it('analyzes exact target and title constraints', () => {
    const exact = analyzeText(`${Array(100).fill('word').join(' ')}.`);
    expect(exact).toMatchObject({
      wordCount: 100,
      sentenceCount: 1,
      target: 100,
      delta: 0,
      isExactly100: true,
    });
    expect(analyzeText('one two.')).toMatchObject({
      delta: -98,
      isExactly100: false,
    });
    expect(analyzeTitle('one two three')).toEqual({
      wordCount: 3,
      isValid: true,
    });
    expect(analyzeTitle('one two')).toEqual({ wordCount: 2, isValid: false });
  });

  it('generates over, under, exact, sentence-length, and longest feedback', () => {
    expect(
      generateFeedback({
        isExactly100: true,
        delta: 0,
        avgWordsPerSentence: 10,
        sentenceCount: 1,
        longestSentence: { wordCount: 10 },
      })
    ).toEqual(['Exactly 100 words! Ready for a title.']);
    expect(
      generateFeedback({
        isExactly100: false,
        delta: 1,
        avgWordsPerSentence: 30,
        sentenceCount: 1,
        longestSentence: { wordCount: 31 },
      })
    ).toEqual([
      '1 word over. Cut 1 word.',
      'Sentences are long (avg 30 words). Consider breaking some up.',
      'Longest sentence is 31 words. Might be hard to follow.',
    ]);
    expect(
      generateFeedback({
        isExactly100: false,
        delta: -2,
        avgWordsPerSentence: 7,
        sentenceCount: 3,
        longestSentence: { wordCount: 2 },
      })
    ).toEqual([
      '2 words under. Add 2 words.',
      'Sentences are short (avg 7 words). Consider combining some.',
    ]);
    expect(
      generateFeedback({
        isExactly100: false,
        delta: 0,
        avgWordsPerSentence: 25,
        sentenceCount: 2,
        longestSentence: { wordCount: 30 },
      })
    ).toEqual(['0 words under. Add 0 words.']);
    expect(
      generateFeedback({
        isExactly100: false,
        delta: -1,
        avgWordsPerSentence: 8,
        sentenceCount: 3,
        longestSentence: { wordCount: 30 },
      })
    ).toEqual(['1 word under. Add 1 word.']);
    expect(
      generateFeedback({
        isExactly100: false,
        delta: -1,
        avgWordsPerSentence: 7,
        sentenceCount: 2,
        longestSentence: { wordCount: 2 },
      })
    ).toEqual(['1 word under. Add 1 word.']);
  });
});
