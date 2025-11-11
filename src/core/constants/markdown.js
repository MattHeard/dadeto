/**
 * Create a factory function returning a frozen object.
 * @param {object} obj - Object to freeze.
 * @returns {() => Readonly<object>} Function returning the frozen object.
 */
export function createConstantFactory(obj) {
  const frozen = Object.freeze(obj);
  return () => frozen;
}

/**
 * Markdown formatting markers.
 * @returns {Readonly<Record<string, string>>} Object of marker characters.
 */
export const markdownMarkers = createConstantFactory({
  ASTERISK: '*',
  UNDERSCORE: '_',
  BACKTICK: '`',
  TILDE: '~',
  DASH: '-',
  EQUAL: '=',
  HASH: '#',
  GREATER_THAN: '>',
  PIPE: '|',
  BACKSLASH: '\\',
  SLASH: '/',
  EXCLAMATION: '!',
  BRACKET_OPEN: '[',
  BRACKET_CLOSE: ']',
  PAREN_OPEN: '(',
  PAREN_CLOSE: ')',
});

/**
 * HTML tag names for supported markdown elements.
 * @returns {Readonly<Record<string, string>>} Map of element keys to tag names.
 */
export const htmlTags = createConstantFactory({
  EMPHASIS: 'em',
  STRONG: 'strong',
  CODE: 'code',
  PARAGRAPH: 'p',
  BLOCKQUOTE: 'blockquote',
  LIST: 'ul',
  LIST_ITEM: 'li',
  ORDERED_LIST: 'ol',
  HORIZONTAL_RULE: 'hr',
  LINE_BREAK: 'br',
  LINK: 'a',
  IMAGE: 'img',
  DIV: 'div',
  SPAN: 'span',
  PRE: 'pre',
});

/**
 * Common CSS class names used when rendering markdown.
 * @returns {Readonly<Record<string, string>>} Object of class names.
 */
export const cssClasses = createConstantFactory({
  CONTAINER: 'markdown-container',
  HEADING: 'markdown-heading',
  PARAGRAPH: 'markdown-paragraph',
  LIST: 'markdown-list',
  LIST_ITEM: 'markdown-list-item',
  BLOCKQUOTE: 'markdown-blockquote',
  CODE: 'markdown-code',
  INLINE_CODE: 'markdown-inline-code',
  LINK: 'markdown-link',
  IMAGE: 'markdown-image',
  HORIZONTAL_RULE: 'markdown-hr',
});

/**
 * Default options for markdown parsing.
 * @returns {Readonly<Record<string, unknown>>} Default configuration values.
 */
export const defaultOptions = createConstantFactory({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
  highlight: null,
  langPrefix: 'language-',
  headerIds: true,
  headerPrefix: '',
  mangle: true,
  baseUrl: null,
  linkTarget: null,
  renderer: null,
});
