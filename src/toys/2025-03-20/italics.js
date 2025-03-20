// Regex patterns for different markdown styles
const BOLD_PATTERN = /(?:\*\*.*?\*\*)|(?:__.*?__)/s;
const ASTERISK_ITALICS_PATTERN = /\*(.*?)\*/g;
const UNDERSCORE_ITALICS_PATTERN = /_(.*?)_/g;

/**
 * Find bold segments in text and split into bold text and surrounding text
 * 
 * @param {string} text - The text to process
 * @returns {Object|null} - Object with boldText, beforeText, and afterText properties, or null if no bold found
 * @private
 */
function findBoldSegments(text) {
  const boldMatch = text.match(BOLD_PATTERN);
  
  if (!boldMatch) {
    return null;
  }
  
  const boldText = boldMatch[0];
  const boldStartIndex = boldMatch.index;
  const boldEndIndex = boldStartIndex + boldText.length;
  
  return {
    boldText,
    beforeText: text.substring(0, boldStartIndex),
    afterText: text.substring(boldEndIndex)
  };
}

/**
 * Adds HTML <em> tags around text marked with Markdown italics while preserving
 * the original Markdown characters.
 * 
 * Handles both *single asterisk* and _underscore_ style Markdown italics.
 * Does NOT add <em> tags around bold markdown syntax (** or __).
 * 
 * @example
 * // Returns: '<em>*italic*</em> text'
 * italics('*italic* text');
 * 
 * @example
 * // Returns: '<em>_italic_</em> text'
 * italics('_italic_ text');
 * 
 * @example
 * // Returns: '**bold** and <em>*italic*</em>'
 * italics('**bold** and *italic*');
 * 
 * @param {string} text - The input text that may contain Markdown italics syntax
 * @returns {string} Text with HTML <em> tags added around Markdown-formatted italics
 */
export function italics(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // We'll use a recursive approach with special handling for bold segments
  return processTextPreservingBold(text);
}

/**
 * Process text recursively to handle all formatting cases, preserving bold segments.
 * This function identifies bold markdown segments and leaves them unmodified,
 * while processing the text before and after for italic formatting.
 * 
 * @example
 * // Returns: '**bold** <em>*italic*</em>'
 * processTextPreservingBold('**bold** *italic*');
 * 
 * @param {string} text - The text to process
 * @returns {string} - Processed text with HTML tags added around italics while preserving bold
 * @private
 */
function processTextPreservingBold(text) {
  // Ensure we have valid input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }
  
  // First, identify any bold patterns
  const boldSegments = findBoldSegments(text);
  
  if (!boldSegments) {
    // No bold pattern found, process italics only
    return applyItalicsFormatting(text);
  }
  
  // Extract the segments
  const { boldText, beforeText, afterText } = boldSegments;
  
  // Process text before and after the bold section for italics
  // Use empty string as fallback for undefined or null segments
  const processedBeforeText = beforeText ? applyItalicsFormatting(beforeText) : '';
  const processedAfterText = afterText ? processTextPreservingBold(afterText) : ''; // Continue processing the rest recursively
  
  // Combine the processed sections with the unchanged bold text
  return processedBeforeText + boldText + processedAfterText;
}

/**
 * Apply HTML formatting to italic markdown in text while preserving the markdown characters.
 * Processes both asterisk and underscore style italic markers.
 * 
 * @example
 * // Returns: '<em>*text*</em>'
 * applyItalicsFormatting('*text*');
 * 
 * @example
 * // Returns: '<em>_text_</em>'
 * applyItalicsFormatting('_text_');
 * 
 * @param {string} text - The text to process
 * @returns {string} - Text with italic markdown wrapped in <em> tags
 * @private
 */
function applyItalicsFormatting(text) {
  // Ensure we have valid input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }
  
  // Process the text through both formatting helpers
  let result = applyAsteriskItalicsFormatting(text);
  result = applyUnderscoreItalicsFormatting(result);
  
  return result;
}

/**
 * Apply HTML formatting to asterisk-style italic markdown
 * @param {string} text - The text to process
 * @returns {string} - Text with asterisk italic markdown wrapped in <em> tags
 * @private
 */
function applyAsteriskItalicsFormatting(text) {
  return text.replace(ASTERISK_ITALICS_PATTERN, '<em>*$1*</em>');
}

/**
 * Apply HTML formatting to underscore-style italic markdown
 * @param {string} text - The text to process
 * @returns {string} - Text with underscore italic markdown wrapped in <em> tags
 * @private
 */
function applyUnderscoreItalicsFormatting(text) {
  return text.replace(UNDERSCORE_ITALICS_PATTERN, '<em>_$1_</em>');
}
