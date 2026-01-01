/**
 * Text analysis utilities for constrained writing.
 * Supports the 100-word blog post format.
 */

const TARGET_WORD_COUNT = 100;

/**
 * Count words in a text string.
 * Words are sequences of non-whitespace characters.
 * @param {string} text - The text to count words in
 * @returns {number} The word count
 */
export function countWords(text) {
  if (!text || typeof text !== "string") {
    return 0;
  }
  const trimmed = text.trim();
  if (trimmed === "") {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 * Count sentences in a text string.
 * Sentences end with . ! or ?
 * @param {string} text - The text to count sentences in
 * @returns {number} The sentence count
 */
export function countSentences(text) {
  if (!text || typeof text !== "string") {
    return 0;
  }
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * Calculate average words per sentence.
 * @param {string} text - The text to analyze
 * @returns {number} Average words per sentence (0 if no sentences)
 */
export function averageWordsPerSentence(text) {
  const sentences = countSentences(text);
  if (sentences === 0) {
    return 0;
  }
  return countWords(text) / sentences;
}

/**
 * Find the longest sentence in the text.
 * @param {string} text - The text to analyze
 * @returns {{sentence: string, wordCount: number}} The longest sentence and its word count
 */
export function findLongestSentence(text) {
  if (!text || typeof text !== "string") {
    return { sentence: "", wordCount: 0 };
  }
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) {
    return { sentence: "", wordCount: 0 };
  }
  let longest = { sentence: "", wordCount: 0 };
  for (const sentence of sentences) {
    const wordCount = countWords(sentence);
    if (wordCount > longest.wordCount) {
      longest = { sentence: sentence.trim(), wordCount };
    }
  }
  return longest;
}

/**
 * Analyze text and return comprehensive metrics.
 * @param {string} text - The text to analyze
 * @returns {object} Analysis results
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
    isExactly100: wordCount === TARGET_WORD_COUNT
  };
}

/**
 * Generate feedback based on text analysis.
 * @param {object} analysis - The analysis object from analyzeText
 * @returns {string[]} Array of feedback strings
 */
export function generateFeedback(analysis) {
  const feedback = [];

  // Word count feedback
  if (analysis.isExactly100) {
    feedback.push("Exactly 100 words! Ready for a title.");
  } else if (analysis.delta > 0) {
    feedback.push(`${analysis.delta} words over. Cut ${analysis.delta} word${analysis.delta === 1 ? "" : "s"}.`);
  } else {
    feedback.push(`${Math.abs(analysis.delta)} words under. Add ${Math.abs(analysis.delta)} word${Math.abs(analysis.delta) === 1 ? "" : "s"}.`);
  }

  // Sentence length feedback
  if (analysis.avgWordsPerSentence > 25) {
    feedback.push("Sentences are long (avg " + analysis.avgWordsPerSentence + " words). Consider breaking some up.");
  } else if (analysis.avgWordsPerSentence < 8 && analysis.sentenceCount > 2) {
    feedback.push("Sentences are short (avg " + analysis.avgWordsPerSentence + " words). Consider combining some.");
  }

  // Longest sentence warning
  if (analysis.longestSentence.wordCount > 30) {
    feedback.push("Longest sentence is " + analysis.longestSentence.wordCount + " words. Might be hard to follow.");
  }

  return feedback;
}

/**
 * Count words in a title.
 * @param {string} title - The title to check
 * @returns {{wordCount: number, isValid: boolean}} Title analysis
 */
export function analyzeTitle(title) {
  const wordCount = countWords(title);
  return {
    wordCount,
    isValid: wordCount === 3
  };
}
