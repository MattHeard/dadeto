/**
 * Markdown formatting markers
 */
export const MARKDOWN_MARKERS = Object.freeze({
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
  PAREN_CLOSE: ')'
});

/**
 * HTML tags for markdown elements
 */
export const HTML_TAGS = Object.freeze({
  EMPHASIS: 'em',
  STRONG: 'strong',
  CODE: 'code',
  PARAGRAPH: 'p',
  HEADING: (level) => `h${Math.min(6, Math.max(1, level))}`,
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
  PRE: 'pre'
});

/**
 * Common CSS class names
 */
export const CSS_CLASSES = Object.freeze({
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
  HORIZONTAL_RULE: 'markdown-hr'
});

/**
 * Default options for markdown parsing
 */
export const DEFAULT_OPTIONS = Object.freeze({
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
  renderer: null
});
