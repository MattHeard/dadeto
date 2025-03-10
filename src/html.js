// html.js - Core HTML utilities layer

// Constants for HTML structure
export const DOCTYPE = '<!DOCTYPE html>';

// Language settings
export const LANGUAGE = {
  EN: 'en',
};

// HTML tag names
export const HTML_TAG_NAME = 'html';

// HTML attribute names
export const ATTR_NAME = {
  LANG: 'lang',
  CLASS: 'class',
  ID: 'id',
};

// HTML escape replacements
export const HTML_ESCAPE_REPLACEMENTS = [
  { from: /&/g, to: '&amp;' },
  { from: /</g, to: '&lt;' },
  { from: />/g, to: '&gt;' },
  { from: /"/g, to: '&quot;' },
  { from: /'/g, to: '&#039;' },
];

// HTML utilities

/**
 * Join an array of strings with an empty string separator
 * @param {Array<string>} parts - The array of strings to join
 * @returns {string} - The joined string
 */
export function joinWithEmptyString(parts) {
  return parts.join('');
}

// HTML tag and attribute symbols
export const TAG_OPEN = '<';
export const TAG_CLOSE = '>';
export const SPACE = ' ';
export const SLASH = '/';
export const EQUALS = '=';
export const QUOTE = '"';

/**
 * Get the parts that make up an opening HTML tag
 * @param {string} tagName - The HTML tag name
 * @param {string} attributes - The HTML attributes as a string
 * @returns {Array<string>} - Array of tag parts
 */
export function getOpeningTagParts(tagName, attributes) {
  return [TAG_OPEN, tagName, SPACE, attributes, TAG_CLOSE];
}

/**
 * Create an opening HTML tag with the specified name and attributes
 * @param {string} tagName - The HTML tag name
 * @param {string} attributes - The HTML attributes as a string
 * @returns {string} - The opening HTML tag
 */
export function createOpeningTag(tagName, attributes) {
  const tagParts = getOpeningTagParts(tagName, attributes);
  return joinWithEmptyString(tagParts);
}

/**
 * Get the parts that make up a closing HTML tag
 * @param {string} tagName - The HTML tag name
 * @returns {Array<string>} - Array of tag parts
 */
export function getClosingTagParts(tagName) {
  return [TAG_OPEN, SLASH, tagName, TAG_CLOSE];
}

/**
 * Create a closing HTML tag with the specified name
 * @param {string} tagName - The HTML tag name
 * @returns {string} - The closing HTML tag
 */
export function createClosingTag(tagName) {
  const tagParts = getClosingTagParts(tagName);
  return joinWithEmptyString(tagParts);
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
  return joinWithEmptyString(tagParts);
}

/**
 * Get the parts of an HTML attribute name-value pair
 * @param {string} attrName - The attribute name
 * @param {string} attrValue - The attribute value
 * @returns {Array<string>} - Array of attribute parts
 */
export function getAttrPairParts(attrName, attrValue) {
  return [attrName, EQUALS, QUOTE, attrValue, QUOTE];
}

/**
 * Create an HTML attribute name-value pair
 * @param {string} attrName - The attribute name
 * @param {string} attrValue - The attribute value
 * @returns {string} - Formatted attribute string (name="value")
 */
export function createAttrPair(attrName, attrValue) {
  const attrParts = getAttrPairParts(attrName, attrValue);
  return joinWithEmptyString(attrParts);
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
 * Helper function for use with reduce to apply HTML escape replacements
 * @param {string} acc - The accumulated text
 * @param {Object} replacement - The replacement definition
 * @returns {string} - Text with the replacement applied
 */
function applyReplacementReducer(acc, replacement) {
  return applyHtmlEscapeReplacement(acc, replacement);
}

/**
 * Apply all HTML escape replacements
 * @param {string} text - The text to process
 * @param {Array<Object>} replacements - Array of replacement definitions
 * @returns {string} - Text with all replacements applied
 */
export function applyAllHtmlEscapeReplacements(text, replacements) {
  return replacements.reduce(applyReplacementReducer, text);
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - HTML-escaped text
 */
export function escapeHtml(text) {
  return applyAllHtmlEscapeReplacements(text, HTML_ESCAPE_REPLACEMENTS);
}

/**
 * Create the DOCTYPE declaration
 * @returns {string} - The DOCTYPE declaration
 */
export function createDoctype() {
  return DOCTYPE;
}

/**
 * Create the HTML tag with language attribute
 * @param {string} content - The content to wrap in the HTML tag
 * @returns {string} - The HTML tag with content
 */
export function createHtmlTag(content) {
  const langAttr = createAttrPair(ATTR_NAME.LANG, LANGUAGE.EN);
  return createTag(HTML_TAG_NAME, langAttr, content);
}

/**
 * Wrap content in HTML structure
 * @param {string} content - The content to wrap
 * @returns {string} - The complete HTML document
 */
export function wrapHtml(content) {
  const htmlTag = createHtmlTag(content);
  const doctype = createDoctype();
  return joinWithEmptyString([doctype, htmlTag]);
}

/**
 * Joins two HTML elements with a specified separator
 * @param {string} first - The first HTML element
 * @param {string} second - The second HTML element
 * @param {string} separator - The separator to join with
 * @returns {string} - Combined HTML string
 */
export function joinHtmlElements(first, second, separator) {
  return [first, second].join(separator);
}
