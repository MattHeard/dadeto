// html.js - Core HTML utilities layer

// Constants for HTML structure
/**
 * Provide the HTML doctype declaration.
 * @returns {string} The doctype string.
 */
export function doctype() {
  return '<!DOCTYPE html>';
}

// Language settings
/**
 * Supported language codes.
 * @returns {{EN: string}} Mapping of language constants.
 */
export function language() {
  return {
    EN: 'en',
  };
}

// HTML tag names
/**
 * Name of the root HTML tag.
 * @returns {string} The tag name.
 */
export function htmlTagName() {
  return 'html';
}

// HTML attribute names
/**
 * Attribute names commonly used in generated markup.
 * @returns {{LANG: string, CLASS: string, ID: string}} Attribute name constants.
 */
export function attrName() {
  return {
    LANG: 'lang',
    CLASS: 'class',
    ID: 'id',
  };
}

// HTML escape replacements
/**
 * Mapping of characters to their HTML escape sequences.
 * @returns {Array<{from: RegExp, to: string}>} Replacement definitions.
 */
export function htmlEscapeReplacements() {
  return [
    { from: /&/g, to: '&amp;' },
    { from: /</g, to: '&lt;' },
    { from: />/g, to: '&gt;' },
    { from: /"/g, to: '&quot;' },
    { from: /'/g, to: '&#039;' },
  ];
}

// HTML utilities

/**
 * Join an array of strings with an empty string separator
 * @param {Array<string>} parts - The array of strings to join
 * @returns {string} - The joined string
 */
export function join(parts) {
  return parts.join('');
}

// HTML tag and attribute symbols
/**
 * Character used to start an HTML tag.
 * @returns {string} The opening tag character.
 */
export function tagOpen() {
  return '<';
}
/**
 * Character used to end an HTML tag.
 * @returns {string} The closing tag character.
 */
export function tagClose() {
  return '>';
}
/**
 * Whitespace character used when building tags.
 * @returns {string} A single space.
 */
export function space() {
  return ' ';
}
/**
 * Slash character for self-closing tags.
 * @returns {string} The slash character.
 */
export function slash() {
  return '/';
}
/**
 * Equals sign used in attribute pairs.
 * @returns {string} The equals character.
 */
export function equals() {
  return '=';
}
/**
 * Quote character used around attribute values.
 * @returns {string} The double quote character.
 */
export function quote() {
  return '"';
}

/**
 * Get the parts that make up an opening HTML tag
 * @param {string} name - The HTML tag name
 * @param {string} attributes - The HTML attributes as a string
 * @returns {Array<string>} - Array of tag parts
 */
export function getOpeningTagParts(name, attributes) {
  if (attributes) {
    return [tagOpen(), name, space(), attributes, tagClose()];
  }
  return [tagOpen(), name, tagClose()];
}

/**
 * Create an opening HTML tag with the specified name and attributes
 * @param {string} tagName - The HTML tag name
 * @param {string} attributes - The HTML attributes as a string
 * @returns {string} - The opening HTML tag
 */
export function createOpeningTag(tagName, attributes = '') {
  const tagParts = getOpeningTagParts(tagName, attributes);
  return join(tagParts);
}

/**
 * Get the parts that make up a closing HTML tag
 * @param {string} name - The HTML tag name
 * @returns {Array<string>} - Array of tag parts
 */
export function getClosingTagParts(name) {
  return [tagOpen(), slash(), name, tagClose()];
}

/**
 * Create a closing HTML tag with the specified name
 * @param {string} tagName - The HTML tag name
 * @returns {string} - The closing HTML tag
 */
export function createClosingTag(tagName) {
  const tagParts = getClosingTagParts(tagName);
  return join(tagParts);
}

/**
 * Create an HTML tag with the specified name, attributes, and content
 * @param {string} tagName - The HTML tag name
 * @param {string} attributes - The HTML attributes as a string
 * @param {string} content - The content to place inside the tag
 * @returns {string} - The complete HTML tag
 */
export function createTag(tagName, attributes, content) {
  const openingTag = createOpeningTag(tagName, attributes);
  const closingTag = createClosingTag(tagName);
  const tagParts = [openingTag, content, closingTag];
  return join(tagParts);
}

/**
 * Get the parts of an HTML attribute name-value pair
 * @param {string} attrName - The attribute name
 * @param {string} attrValue - The attribute value
 * @returns {Array<string>} - Array of attribute parts
 */
export function getAttrPairParts(attrName, attrValue) {
  return [attrName, equals(), quote(), attrValue, quote()];
}

/**
 * Create an HTML attribute name-value pair
 * @param {string} attrName - The attribute name
 * @param {string} attrValue - The attribute value
 * @returns {string} - Formatted attribute string (name="value")
 */
export function createAttrPair(attrName, attrValue) {
  const attrParts = getAttrPairParts(attrName, attrValue);
  return join(attrParts);
}

/**
 * Apply a single HTML escape replacement
 * @param {string} text - The text to process
 * @param {object} replacement - The replacement definition
 * @param {RegExp} replacement.from - The pattern to replace
 * @param {string} replacement.to - The replacement string
 * @returns {string} - Text with the replacement applied
 */
export function applyHtmlEscapeReplacement(text, replacement) {
  const { from, to } = replacement;
  return text.replace(from, to);
}

/**
 * Apply all HTML escape replacements
 * @param {string} text - The text to process
 * @param {Array<object>} replacements - Array of replacement definitions
 * @returns {string} - Text with all replacements applied
 */
export function applyAllHtmlEscapeReplacements(text, replacements) {
  return replacements.reduce(applyHtmlEscapeReplacement, text);
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - HTML-escaped text
 */
export function escapeHtml(text) {
  const safeText = text ?? '';
  return applyAllHtmlEscapeReplacements(
    String(safeText),
    htmlEscapeReplacements()
  );
}

/**
 * Create the HTML tag with language attribute
 * @param {string} content - The content to wrap in the HTML tag
 * @returns {string} - The HTML tag with content
 */
export function createHtmlTag(content) {
  const langAttr = createAttrPair(attrName().LANG, language().EN);
  return createTag(htmlTagName(), langAttr, content);
}

/**
 * Wrap content in HTML structure
 * @param {string} content - The content to wrap
 * @returns {string} - The complete HTML document
 */
export function wrapHtml(content) {
  const htmlTag = createHtmlTag(content);
  return join([doctype(), htmlTag]);
}
