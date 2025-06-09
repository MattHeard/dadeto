// html.js - Core HTML utilities layer

// Constants for HTML structure
export function doctype() {
  return '<!DOCTYPE html>';
}

// Language settings
export function language() {
  return {
    EN: 'en',
  };
}

// HTML tag names
export function htmlTagName() {
  return 'html';
}

// HTML attribute names
export function attrName() {
  return {
    LANG: 'lang',
    CLASS: 'class',
    ID: 'id',
  };
}

// HTML escape replacements
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
export function tagOpen() {
  return '<';
}
export function tagClose() {
  return '>';
}
export function space() {
  return ' ';
}
export function slash() {
  return '/';
}
export function equals() {
  return '=';
}
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
 * @param {Object} replacement - The replacement definition
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
 * @param {Array<Object>} replacements - Array of replacement definitions
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
  return applyAllHtmlEscapeReplacements(text, htmlEscapeReplacements());
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
