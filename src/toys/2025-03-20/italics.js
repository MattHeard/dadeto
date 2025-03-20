// Regex patterns for different markdown styles
const BOLD_PATTERN = /(?:\*\*.*?\*\*)|(?:__.*?__)/s;
const ASTERISK_ITALICS_PATTERN = /\*(.*?)\*/g;
const UNDERSCORE_ITALICS_PATTERN = /_(.*?)_/g;

// Configurations for different italic styles
const ITALIC_STYLES = [
  { pattern: ASTERISK_ITALICS_PATTERN, marker: '*' },
  { pattern: UNDERSCORE_ITALICS_PATTERN, marker: '_' }
];





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
  // For recursive calls with empty segments, return early
  if (!text || text.trim() === '') {
    return '';
  }
  
  // First, identify any bold patterns
  const boldSegments = findBoldSegments(text);
  
  if (!boldSegments) {
    // No bold pattern found, process italics only
    return processAllItalicStyles(text);
  }
  
  // Extract the segments and immediately process them for the return value
  const { boldText, beforeText, afterText } = boldSegments;
  
  // Combine the processed sections with the unchanged bold text in a single return statement
  return (beforeText ? processAllItalicStyles(beforeText) : '') + 
         boldText + 
         (afterText ? processTextPreservingBold(afterText) : '');
}

// Main exported function

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

// Helper functions for processing text

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
 * Apply HTML formatting to italic markdown in text while preserving the markdown characters.
 * Processes both asterisk and underscore style italic markers.
 * 
 * @example
 * // Returns: '<em>*text*</em>'
 * processAllItalicStyles('*text*');
 * 
 * @example
 * // Returns: '<em>_text_</em>'
 * processAllItalicStyles('_text_');
 * 
 * @param {string} text - The text to process
 * @returns {string} - Text with italic markdown wrapped in <em> tags
 * @private
 */

/**
 * Apply a specific italic style configuration to the text
 * @param {string} text - The text to process
 * @param {Object} styleConfig - Configuration object with pattern and marker
 * @returns {string} - Text with the particular italic style formatted
 * @private
 */
function applyItalicStyleConfig(text, styleConfig) {
  return applySingleStyleItalicFormat(
    text,
    styleConfig.pattern,
    styleConfig.marker
  );
}

/**
 * Process text through all italic style types (asterisk and underscore)
 * @param {string} text - The text to process 
 * @returns {string} - Text with all italic styles formatted
 * @private
 */
function processAllItalicStyles(text) {
  // Process the text through all italic styles using reduce
  return ITALIC_STYLES.reduce(
    (processedText, styleConfig) => applyItalicStyleConfig(processedText, styleConfig),
    text
  );
}

/**
 * Apply HTML formatting to markdown italics of a specific style
 * @param {string} text - The text to process
 * @param {RegExp} pattern - The regex pattern to match
 * @param {string} marker - The markdown marker character (* or _)
 * @returns {string} - Text with italic markdown wrapped in <em> tags
 * @private
 */
function applySingleStyleItalicFormat(text, pattern, marker) {
  return text.replace(pattern, `<em>${marker}$1${marker}</em>`);
}
