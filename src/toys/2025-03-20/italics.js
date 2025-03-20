// Regex patterns for different markdown styles
const BOLD_PATTERN = /(?:\*\*.*?\*\*)|(?:__.*?__)/s;
const ASTERISK_ITALICS_PATTERN = /\*(.*?)\*/g;
const UNDERSCORE_ITALICS_PATTERN = /_(.*?)_/g;

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
  // First, identify any bold patterns
  const boldMatch = text.match(BOLD_PATTERN);
  
  if (!boldMatch) {
    // No bold pattern found, process italics only
    return applyItalicsFormatting(text);
  }
  
  const boldText = boldMatch[0];
  const boldStartIndex = boldMatch.index;
  const boldEndIndex = boldStartIndex + boldText.length;
  
  // Text before the bold section
  const beforeText = text.substring(0, boldStartIndex);
  // Text after the bold section
  const afterText = text.substring(boldEndIndex);
  
  // Process text before and after the bold section for italics
  const processedBeforeText = applyItalicsFormatting(beforeText);
  const processedAfterText = processTextPreservingBold(afterText); // Continue processing the rest recursively
  
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
  let result = text;
  
  // Process *asterisk* style italics
  result = result.replace(ASTERISK_ITALICS_PATTERN, '<em>*$1*</em>');
  
  // Process _underscore_ style italics 
  result = result.replace(UNDERSCORE_ITALICS_PATTERN, '<em>_$1_</em>');
  
  return result;
}
