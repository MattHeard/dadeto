// Markdown marker characters
const ASTERISK_MARKER = '*';
const UNDERSCORE_MARKER = '_';

// Pattern to match special regex characters that need escaping
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/;

function isEmptyText(text) {
  return !text?.trim();
}

function hasNoBoldSegments(text) {
  return !findBoldSegments(text);
}

/**
 * Creates a doubled marker (e.g., ** or __) for bold text
 * @param {string} marker - The marker character (* or _)
 * @returns {string} - The doubled marker
 * @private
 */
function createDoubledMarker(marker) {
  return marker.repeat(2);
}

/**
 * Returns the doubled marker for use in bold pattern parts.
 * @param {string} marker - The (possibly escaped) marker character
 * @returns {string} - The doubled marker string
 * @private
 */
function getDoubledMarker(marker) {
  return createDoubledMarker(marker);
}

/**
 * Creates a regex pattern part for bold text with a specific marker
 * @param {string} marker - The marker character (* or _)
 * @returns {string} - Regex pattern string for bold with the specified marker
 * @private
 */
function createBoldPatternPart(marker) {
  // Escape marker if it's a special regex character
  let escapedMarker;
  if (REGEX_SPECIAL_CHARS.test(marker)) {
    escapedMarker = `\\${marker}`;
  } else {
    escapedMarker = marker;
  }
  const doubledMarker = getDoubledMarker(escapedMarker);

  // Break the pattern into its constituent parts
  const patternParts = [
    '(?:', // Opening non-capturing group
    doubledMarker, // Opening doubled marker
    '.*?', // Lazy match of content
    doubledMarker, // Closing doubled marker
    ')' // Closing group
  ];

  return patternParts.join('');
}

/**
 * Returns a regex pattern that matches both asterisk and underscore bold markdown
 * @returns {RegExp} - The regex pattern for bold markdown
 * @private
 */
function createBoldPattern() {
  const boldMarkers = [ASTERISK_MARKER, UNDERSCORE_MARKER];
  const patternParts = boldMarkers.map(createBoldPatternPart);

  // Combine with OR operator for alternative matching
  const pattern = patternParts.join('|');

  return new RegExp(pattern, 's');
}

/**
 * Returns a regex pattern that matches text wrapped with a specific marker
 * @param {string} marker - The marker character (* or _)
 * @returns {RegExp} - The regex pattern for the specified marker
 * @private
 */
function createItalicsPattern(marker) {
  // Escape marker if it's a special regex character
  let escapedMarker;
  if (REGEX_SPECIAL_CHARS.test(marker)) {
    escapedMarker = `\\${marker}`;
  } else {
    escapedMarker = marker;
  }
  return new RegExp(`${escapedMarker}(.*?)${escapedMarker}`, 'g');
}

/**
 * Returns the array of markers used for italic styles
 * @returns {Array} - Array of marker characters
 * @private
 */
function getItalicMarkers() {
  return [ASTERISK_MARKER, UNDERSCORE_MARKER];
}

/**
 * Assembles the processed segments (before, bold, after) into a single string.
 *
 * @param {string} beforeText - The text before the bold segment
 * @param {string} boldText - The bold segment text
 * @param {string} afterText - The text after the bold segment
 * @returns {string} - The final assembled string after processing
 * @private
 */
function assembleProcessedText(beforeText, boldText, afterText) {
  return [
    processItalicBefore(beforeText),
    boldText,
    processBoldAfter(afterText)
  ].filter(Boolean).join('');
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
function shouldBypassBold(text) {
  return isEmptyText(text) || hasNoBoldSegments(text);
}

function processTextPreservingBold(text) {
  if (shouldBypassBold(text)) {
    return processAllItalicStyles(text);
  }

  const segment = findBoldSegments(text);
  return assembleProcessedText(segment.beforeText, segment.boldText, segment.afterText);
}

function processItalicBefore(beforeText) {
  if (beforeText) {
    return processAllItalicStyles(beforeText);
  } else {
    return '';
  }
}

function processBoldAfter(afterText) {
  if (afterText) {
    return processTextPreservingBold(afterText);
  } else {
    return '';
  }
}

// Helper function to check if text is invalid
function isInvalidText(text) {
  return !text || typeof text !== 'string';
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
  if (isInvalidText(text)) {
    return text;
  }

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
  const boldPattern = createBoldPattern();
  const boldMatch = boldPattern.exec(text);

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
 * Apply italic formatting for a specific marker to the text
 * @param {string} text - The text to process
 * @param {string} marker - The marker character (* or _)
 * @returns {string} - Text with the particular italic style formatted
 * @private
 */
function applyItalicFormatting(text, marker) {
  const pattern = createItalicsPattern(marker);
  return text.replace(pattern, (match, capturedContent) => {
    return createItalicReplacementString(capturedContent, marker);
  });
}

/**
 * Process text through all italic style types (asterisk and underscore)
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
 * @returns {string} - Text with all italic styles formatted
 * @private
 */
function processAllItalicStyles(text) {
  // Process the text through all italic markers using reduce
  return getItalicMarkers().reduce(applyItalicFormatting, text);
}

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

/**
 * Create a replacement string for italic markdown content
 * @param {string} content - The inner content of the markdown
 * @param {string} marker - The markdown marker character (* or _)
 * @returns {string} - HTML formatted replacement string
 * @private
 */
function createItalicReplacementString(content, marker) {
  // First wrap content with markdown markers, then with HTML tag
  return wrapWithHtmlTag('em', wrapWithMarker(content, marker));
}
