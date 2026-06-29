/**
 * Text analysis utilities for constrained writing.
 * Supports the 100-word blog post format.
 */

const TARGET_WORD_COUNT = 100;

/**
 * Count the words in a string-like value.
 * @param {unknown} text Input text.
 * @returns {number} Word count.
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
 * Count sentence-ending punctuation groups in a string-like value.
 * @param {unknown} text Input text.
 * @returns {number} Sentence count.
 */
export function countSentences(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  const matches = text.match(/[.!?]+/g);
  if (!matches) {
    return 0;
  }
  return matches.length;
}

/**
 * Compute average words per sentence for a string-like value.
 * @param {unknown} text Input text.
 * @returns {number} Average words per sentence.
 */
export function averageWordsPerSentence(text) {
  const sentences = countSentences(text);
  if (sentences === 0) {
    return 0;
  }
  return countWords(text) / sentences;
}

/**
 * Find the longest sentence in a string-like value.
 * @param {unknown} text Input text.
 * @returns {{ sentence: string, wordCount: number }} Longest sentence summary.
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
 * Analyze a text sample against the 100-word target.
 * @param {unknown} text Input text.
 * @returns {{
 *   wordCount: number,
 *   sentenceCount: number,
 *   avgWordsPerSentence: number,
 *   longestSentence: { sentence: string, wordCount: number },
 *   target: number,
 *   delta: number,
 *   isExactly100: boolean,
 * }} Text analysis summary.
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
 * Generate feedback from a text analysis.
 * @param {{
 *   isExactly100: boolean,
 *   delta: number,
 *   avgWordsPerSentence: number,
 *   sentenceCount: number,
 *   longestSentence: { wordCount: number },
 * }} analysis Text analysis summary.
 * @returns {string[]} Feedback lines.
 */
export function generateFeedback(analysis) {
  const feedback = [];

  if (analysis.isExactly100) {
    feedback.push('Exactly 100 words! Ready for a title.');
  } else if (analysis.delta > 0) {
    feedback.push(formatWordCountFeedback(analysis.delta, 'over', 'Cut'));
  } else {
    feedback.push(
      formatWordCountFeedback(Math.abs(analysis.delta), 'under', 'Add')
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
 * Format word-count feedback.
 * @param {number} count Word delta.
 * @param {string} direction Whether the text is over or under.
 * @param {string} verb Suggested action verb.
 * @returns {string} Feedback line.
 */
function formatWordCountFeedback(count, direction, verb) {
  let wordSuffix = 's';
  if (count === 1) {
    wordSuffix = '';
  }

  return `${String(count)} word${wordSuffix} ${direction}. ${verb} ${count} word${wordSuffix}.`;
}

/**
 * Analyze a title.
 * @param {unknown} title Title candidate.
 * @returns {{ wordCount: number, isValid: boolean }} Title analysis summary.
 */
export function analyzeTitle(title) {
  const wordCount = countWords(title);
  return {
    wordCount,
    isValid: wordCount === 3,
  };
}
