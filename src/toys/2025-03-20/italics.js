// Markdown marker characters
const ASTERISK_MARKER = '*';
const UNDERSCORE_MARKER = '_';

/**
 * Returns a regex pattern that matches both asterisk and underscore bold markdown
 * @returns {RegExp} - The regex pattern for bold markdown
 * @private
 */
function createBoldPattern() {
  return new RegExp(`(?:\\${ASTERISK_MARKER}\\${ASTERISK_MARKER}.*?\\${ASTERISK_MARKER}\\${ASTERISK_MARKER})|(?:${UNDERSCORE_MARKER}${UNDERSCORE_MARKER}.*?${UNDERSCORE_MARKER}${UNDERSCORE_MARKER})`, 's');
}

/**
 * Returns a regex pattern that matches text wrapped with a specific marker
 * @param {string} marker - The marker character (* or _)
 * @returns {RegExp} - The regex pattern for the specified marker
 * @private
 */
function createItalicsPattern(marker) {
  // Escape marker if it's a special regex character
  const escapedMarker = /[.*+?^${}()|[\]\\]/.test(marker) ? `\\${marker}` : marker;
  return new RegExp(`${escapedMarker}(.*?)${escapedMarker}`, 'g');
}





/**
 * Creates a style configuration object for a specific marker
 * @param {string} marker - The marker character (* or _)
 * @returns {Object} - A style configuration object with pattern and marker properties
 * @private
 */
function createItalicStyle(marker) {
  return {
    pattern: createItalicsPattern(marker),
    marker
  };
}

// Configurations for different italic styles
const ITALIC_STYLES = [
  createItalicStyle(ASTERISK_MARKER),
  createItalicStyle(UNDERSCORE_MARKER)
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
  const boldMatch = text.match(createBoldPattern());
  
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
  return text.replace(styleConfig.pattern, (match, capturedContent) => {
    return createItalicReplacementString(capturedContent, styleConfig.marker);
  });
}

/**
 * Process text through all italic style types (asterisk and underscore)
 * @param {string} text - The text to process 
 * @returns {string} - Text with all italic styles formatted
 * @private
 */
function processAllItalicStyles(text) {
  // Process the text through all italic styles using reduce
  return ITALIC_STYLES.reduce(applyItalicStyleConfig, text);
}

/**
 * Create a replacement string for italic markdown content
 * @param {string} content - The inner content of the markdown
 * @param {string} marker - The markdown marker character (* or _)
 * @returns {string} - HTML formatted replacement string
 * @private
 */
/**
 * Wrap content with a marker at the beginning and end
 * @param {string} content - The content to wrap
 * @param {string} marker - The marker to add at beginning and end
 * @returns {string} - Content wrapped with markers
 * @private
 */
function wrapWithMarker(content, marker) {
  return `${marker}${content}${marker}`;
}

/**
 * Create an HTML tag wrapper for content
 * @param {string} tagName - The HTML tag name (without brackets)
 * @param {string} content - The content to wrap
 * @returns {string} - The content wrapped in the HTML tag
 * @private
 */
function wrapWithHtmlTag(tagName, content) {
  return [`<${tagName}>`, content, `</${tagName}>`].join('');
}

function createItalicReplacementString(content, marker) {
  // First wrap content with markdown markers, then with HTML tag
  return wrapWithHtmlTag('em', wrapWithMarker(content, marker));
}


