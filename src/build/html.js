import { createHtmlHandle } from '../core/build/html.js';

const handle = createHtmlHandle();

export const {
  doctype,
  language,
  htmlTagName,
  attrName,
  htmlEscapeReplacements,
  join,
  tagOpen,
  tagClose,
  space,
  slash,
  equals,
  quote,
  getOpeningTagParts,
  createOpeningTag,
  getClosingTagParts,
  createClosingTag,
  createTag,
  getAttrPairParts,
  createAttrPair,
  applyHtmlEscapeReplacement,
  applyAllHtmlEscapeReplacements,
  escapeHtml,
  createHtmlTag,
  wrapHtml,
} = handle;

export { handle };
