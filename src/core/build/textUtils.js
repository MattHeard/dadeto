/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description, jsdoc/require-param-type, complexity, no-ternary */
/**
 * Text analysis utilities for constrained writing.
 * Supports the 100-word blog post format.
 */

const TARGET_WORD_COUNT = 100;

/**
 *
 * @param text
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  const trimmed = text.trim();
  if (trimmed === '') {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 *
 * @param text
 */
export function countSentences(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 *
 * @param text
 */
export function averageWordsPerSentence(text) {
  const sentences = countSentences(text);
  if (sentences === 0) {
    return 0;
  }
  return countWords(text) / sentences;
}

/**
 *
 * @param text
 */
export function findLongestSentence(text) {
  if (!text || typeof text !== 'string') {
    return { sentence: '', wordCount: 0 };
  }
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) {
    return { sentence: '', wordCount: 0 };
  }
  let longest = { sentence: '', wordCount: 0 };
  for (const sentence of sentences) {
    const wordCount = countWords(sentence);
    if (wordCount > longest.wordCount) {
      longest = { sentence: sentence.trim(), wordCount };
    }
  }
  return longest;
}

/**
 *
 * @param text
 */
export function analyzeText(text) {
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const avgWordsPerSentence = averageWordsPerSentence(text);
  const longestSentence = findLongestSentence(text);
  const delta = wordCount - TARGET_WORD_COUNT;

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    longestSentence,
    target: TARGET_WORD_COUNT,
    delta,
    isExactly100: wordCount === TARGET_WORD_COUNT,
  };
}

/**
 *
 * @param analysis
 */
export function generateFeedback(analysis) {
  const feedback = [];

  if (analysis.isExactly100) {
    feedback.push('Exactly 100 words! Ready for a title.');
  } else if (analysis.delta > 0) {
    feedback.push(
      `${String(analysis.delta)} words over. Cut ${analysis.delta} word${
        analysis.delta === 1 ? '' : 's'
      }.`
    );
  } else {
    feedback.push(
      `${String(Math.abs(analysis.delta))} words under. Add ${Math.abs(
        analysis.delta
      )} word${Math.abs(analysis.delta) === 1 ? '' : 's'}.`
    );
  }

  if (analysis.avgWordsPerSentence > 25) {
    feedback.push(
      `Sentences are long (avg ${
        analysis.avgWordsPerSentence
      } words). Consider breaking some up.`
    );
  } else if (analysis.avgWordsPerSentence < 8 && analysis.sentenceCount > 2) {
    feedback.push(
      `Sentences are short (avg ${
        analysis.avgWordsPerSentence
      } words). Consider combining some.`
    );
  }

  if (analysis.longestSentence.wordCount > 30) {
    feedback.push(
      `Longest sentence is ${
        analysis.longestSentence.wordCount
      } words. Might be hard to follow.`
    );
  }

  return feedback;
}

/**
 *
 * @param title
 */
export function analyzeTitle(title) {
  const wordCount = countWords(title);
  return {
    wordCount,
    isValid: wordCount === 3,
  };
}
