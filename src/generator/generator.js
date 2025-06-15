import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import { headerBanner } from './title.js';
import {
  createTag,
  createAttrPair,
  escapeHtml,
  wrapHtml,
  join,
  attrName,
} from './html.js';

function createParagraphs(content) {
  if (Array.isArray(content)) {
    return content.map(para => `<p>${para}</p>`).join('');
  } else {
    return `<p>${content}</p>`;
  }
}

function createBlockquote(content) {
  return `<blockquote class="${CLASS.VALUE}">${BLOCKQUOTE_CORNERS}${createParagraphs(content)}</blockquote>`;
}

const CLASS = {
  KEY: 'key',
  VALUE: 'value',
  ENTRY: 'entry',
  ARTICLE_TITLE: 'article-title',
  METADATA: 'metadata',
  FOOTER: 'footer',
  WARNING: 'warning',
  MEDIA: 'media',
};

const BLOCKQUOTE_CORNERS = `<div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div>`;
const DIV_TAG_NAME = 'div';
const ARTICLE_TAG_NAME = 'article';
const DATE_LOCALE = 'en-GB';
const DATE_FORMAT_OPTIONS = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
const CONTAINER_ID = 'container';

/**
 * Create a div element with specified classes and content
 * @param {string} classes - CSS classes to apply to the div
 * @param {string} content - HTML content to place inside the div
 * @returns {string} - HTML div element
 */
function createDiv(classes, content) {
  const classAttr = createAttrPair(attrName().CLASS, classes);
  return createTag(DIV_TAG_NAME, classAttr, content);
}

/**
 * Build a key-value section.
 * @param {string} label – text for the key div
 * @param {string} valueHTML – full HTML for the value element
 * @param {boolean} [wrapValueDiv=true] – whether to wrap valueHTML in a value div
 * @returns {string} formatted section HTML
 */
function getKeyClass(keyExtraClasses) {
  if (keyExtraClasses) {
    return `${CLASS.KEY} ${keyExtraClasses}`;
  }
  return CLASS.KEY;
}

function buildLabeledSectionPair(keyDiv, valueHTML, wrapValueDiv) {
  const valuePart = labeledSectionValuePart(valueHTML, wrapValueDiv);
  return createPair(keyDiv, valuePart);
}

function defaultWrapValueDiv(args) {
  if (args.wrapValueDiv === undefined) {
    args.wrapValueDiv = true;
  }
  return args;
}

export function defaultKeyExtraClasses(args) {
  if (args.keyExtraClasses === undefined) {
    args.keyExtraClasses = '';
  }
  return args;
}

function applyLabeledSectionDefaults(args) {
  return defaultKeyExtraClasses(defaultWrapValueDiv(args));
}

function prepareLabeledSectionArgs(args) {
  const { label, valueHTML, wrapValueDiv, keyExtraClasses } =
    applyLabeledSectionDefaults(args);
  const keyClass = getKeyClass(keyExtraClasses);
  const keyDiv = createDiv(keyClass, label);
  return { keyDiv, valueHTML, wrapValueDiv };
}

function createLabeledSection(args) {
  const { keyDiv, valueHTML, wrapValueDiv } = prepareLabeledSectionArgs(args);
  return buildLabeledSectionPair(keyDiv, valueHTML, wrapValueDiv);
}

function labeledSectionValuePart(valueHTML, wrapValueDiv) {
  if (wrapValueDiv) {
    return createValueDiv(valueHTML);
  }
  return valueHTML;
}

/**
 * Join CSS classes into a space-separated string
 * @param {string[]} classes - Array of CSS class names
 * @returns {string} - Space-separated class string
 */
function joinClasses(classes) {
  return classes.join(' ');
}

/**
 * Create a div with the value class and optional additional classes
 * @param {string} content - Content for the value div
 * @param {string[]} additionalClasses - Additional CSS classes to apply
 * @returns {string} - HTML div element with value class and any additional classes
 */
function createValueDiv(content, additionalClasses = []) {
  const classes = [CLASS.VALUE, ...additionalClasses];
  const joinedClasses = joinClasses(classes);
  return createDiv(joinedClasses, content);
}

/**
 * Create a pair with two elements
 * @param {string} first - The first element
 * @param {string} second - The second element
 * @returns {string} - Combined HTML without newlines
 */
function createPair(first, second) {
  return join([first, second]);
}

/**
 * Convert a date string to a Date object
 * @param {string} dateString - The date string to convert
 * @returns {Date} - The Date object
 */
function createDateFromString(dateString) {
  return new Date(dateString);
}

/**
 * Format a date using the locale and options
 * @param {Date} date - The date to format
 * @returns {string} - The formatted date string
 */
function formatDateWithOptions(date) {
  return date.toLocaleDateString(DATE_LOCALE, DATE_FORMAT_OPTIONS);
}

/**
 * Format date in "4 May 2022" format
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date string
 */
function formatDate(dateString) {
  const date = createDateFromString(dateString);
  return formatDateWithOptions(date);
}

// Header components
// No longer using newlines and indentation
const METADATA_TEXT = `Software developer and philosopher in Berlin`;

/**
 * Create an empty div with the key class
 * @returns {string} - HTML div element with key class and no content
 */
/**
 * Create the content for the header section
 */
function createHeaderContent() {
  const valueDivs = [
    createValueDiv(headerBanner()),
    createValueDiv(METADATA_TEXT, [CLASS.METADATA]),
  ];
  const parts = valueDivs.map(valueDiv =>
    createLabeledSection({
      label: '',
      valueHTML: valueDiv,
      wrapValueDiv: false,
    })
  );
  return join(parts);
}

/**
 * Create a section with the given content
 * @param {string} content - The content to wrap in a section
 * @returns {string} - HTML for the section
 */
function createSection(content) {
  return createDiv(CLASS.ENTRY, content);
}

/**
 * Create the header section with banner and metadata
 * @returns {string} - HTML for the header section
 */
function createHeaderSection() {
  const headerContent = createHeaderContent();
  return createSection(headerContent);
}

// Footer components
const WARNING_MESSAGE =
  'All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.';

/**
 * Create the content for the footer section
 * @returns {string} - HTML for the footer content
 */
function createFooterContent() {
  const classes = joinClasses([CLASS.FOOTER, CLASS.VALUE, CLASS.WARNING]);
  const footerDiv = createDiv(classes, WARNING_MESSAGE);
  return createLabeledSection({
    label: '',
    valueHTML: footerDiv,
    wrapValueDiv: false,
  });
}

/**
 * Create the footer section with warning message
 * @returns {string} - HTML for the footer section
 */
function createFooterSection() {
  const footerContent = createFooterContent();
  return createSection(footerContent);
}

// Page structure
/**
 * Create the opening tag for the container div
 * @returns {string} - Opening div tag with container ID
 */
function createContainerDivOpen() {
  const idAttr = createAttrPair(attrName().ID, CONTAINER_ID);
  return `<${DIV_TAG_NAME} ${idAttr}>`;
}

/**
 * Create the header content array
 */
function createHeaderContentArray(headerElement) {
  return [
    headElement(),
    '<body>',
    createContainerDivOpen(),
    '<!-- Header -->',
    headerElement,
  ];
}

/**
 * Create the page header with head element, body opening tag and header section
 */
function createPageHeader() {
  const headerElement = createHeaderSection();
  const contentArray = createHeaderContentArray(headerElement);
  return contentArray.join('');
}

/**
 * Create the closing container div
 */
function createContainerDivClose() {
  return '</div>';
}

/**
 * Create the body closing tag
 */
function createBodyClose() {
  return '</body>';
}

/**
 * Create the footer content array
 */
function createFooterContentArray(footerElement) {
  return [
    '',
    footerElement,
    createContainerDivClose(),
    '<script type="module" src="browser/main.js" defer></script>',
    createBodyClose(),
  ];
}

/**
 * Create the page footer with footer section, container div closing, and body closing tag
 */
function createPageFooter() {
  const footerElement = createFooterSection();
  const contentArray = createFooterContentArray(footerElement);
  return contentArray.join('');
}

/**
 * Convert a post to article HTML
 */
function convertPostToArticleHTML(post) {
  return generateArticle(post);
}

/**
 * Format article HTML with indentation
 */
function formatArticleHTML(articleHTML) {
  return articleHTML;
}

/**
 * Process posts and join article HTML
 */
function processPostsToHTML(posts) {
  return posts.map(convertPostToArticleHTML).map(formatArticleHTML).join('');
}

/**
 * Generate HTML for all articles in the blog
 */
function generateArticles(posts) {
  return processPostsToHTML(posts);
}

/**
 * Create attributes for an article element
 */
export function createIdAttributeIfNeeded(post) {
  return ' ' + createAttrPair(attrName().ID, post.key);
}

function getTagClassList(post) {
  if (hasTags(post)) {
    return post.tags.map(tag => `tag-${tag}`);
  } else {
    return [];
  }
}

function createArticleClassAttr(post) {
  const classes = [CLASS.ENTRY, ...getTagClassList(post)];
  if (post.release === 'beta') {
    classes.push('release-beta');
  }
  const classValue = joinClasses(classes);
  return createAttrPair(attrName().CLASS, classValue);
}

function createArticleAttributes(post) {
  const classAttr = createArticleClassAttr(post);
  const idAttr = createIdAttributeIfNeeded(post);
  return `${classAttr}${idAttr}`;
}

/**
 * Format article content with full width element
 */
function formatArticleContent(content) {
  return `${fullWidthElement()}${content}`;
}

/**
 * Create an article from a blog post
 */
function generateArticle(post) {
  const content = generateArticleContent(post);
  const formattedContent = formatArticleContent(content);
  const attributes = createArticleAttributes(post);
  return createTag(ARTICLE_TAG_NAME, attributes, formattedContent);
}

/**
 * Get content array from post, defaulting to empty array if not present
 */
function getContentArray(post) {
  return post.content || [];
}

/**
 * Determine if an item is the first in the content array
 */
function isFirstContentItem(index) {
  return index === 0;
}

/**
 * Create a content item with index awareness
 */
function createContentItemWithIndex(text, index) {
  const isFirst = isFirstContentItem(index);
  return createContentSectionItem(text, isFirst);
}

/**
 * Normalize a content item.
 * If content is already an object, return it unchanged;
 * otherwise, wrap it in an object with type 'text' and content fields.
 * @param {Object|string} content - The content item to normalize.
 * @returns {Object} - Normalized content object.
 */
/**
 * @typedef {Object} NormalizedContent
 * @property {string} type - The normalized content type.
 * @property {*} content - The normalized content data.
 */

/**
 * @typedef {Object} ContentTypeHandler
 * @property {function(*): boolean} predicate - Returns true if this handler matches the content.
 * @property {function(*): NormalizedContent} normalize - Normalizes the content to a standard object.
 * @property {string} type - The normalized content type name.
 * @property {function(*): string} render - Renders the normalized content as HTML.
 */

// Hardcoded normalization rules and content renderers
const normalizationRules = [
  [
    c => typeof c !== 'object' || c === null,
    c => ({ type: 'text', content: c }),
  ],
  [() => true, c => c],
];

const CONTENT_RENDERERS = {
  quote: createBlockquote,
  text: renderAsParagraph,
  __default__: renderAsParagraph,
};

/**
 * Returns the normalizer function for the given raw content.
 * @param {*} content - Raw content to normalize.
 * @returns {function(*): NormalizedContent} - Normalizer function that returns a normalized content object.
 */
function getContentNormalizer(content) {
  const found = normalizationRules.find(([predicate]) => predicate(content));
  return found[1];
}

/**
 * Normalizes a content item using the registered normalizers.
 * @param {*} content - Raw content to normalize.
 * @returns {NormalizedContent} Normalized content object with { type, content }.
 */
function normalizeContentItem(content) {
  return getContentNormalizer(content)(content);
}

/**
 * Returns the renderer function for a given normalized content type.
 * @param {string} type - The normalized content type.
 * @returns {function(*): string} - Renderer function that returns HTML.
 */
function getContentRenderer(type) {
  return CONTENT_RENDERERS[type];
}

/**
 * Renders normalized content by dispatching to the correct renderer by type.
 * @param {NormalizedContent} normalizedContent - Normalized content object with { type, content }.
 * @returns {string} Rendered HTML.
 */
function renderValueDiv(normalizedContent) {
  const { type, content } = normalizedContent;
  const renderer = getContentRenderer(type);
  return renderer(content);
}

function renderAsParagraph(content) {
  return `<p class="${CLASS.VALUE}">${content}</p>`;
}

/**
 * Create a content section item with exact formatting
 * @param {Object|string} content - The content object or text
 * @param {boolean} isFirst - Whether this is the first content item
 * @returns {string} - Formatted content section HTML
 */
function createContentSectionItem(content, isFirst) {
  const normalizedContent = normalizeContentItem(content);
  let key = '';
  if (isFirst) {
    key = 'text';
  }
  const keyDiv = createDiv(CLASS.KEY, key);
  const valueDiv = renderValueDiv(normalizedContent);
  return createPair(keyDiv, valueDiv);
}

/**
 * Generate the text content sections for a blog post
 */
function generateContentSections(post) {
  const contentArray = getContentArray(post);
  const contentItems = contentArray.map(createContentItemWithIndex);
  return join(contentItems);
}

/**
 * Generate header section for a blog post
 */
function generateHeaderSection(post) {
  const titleSection = generateTitleSection(post);
  const dateSection = generateDateSection(post);
  const tagsSection = generateTagsSection(post);
  return join([titleSection, dateSection, tagsSection]);
}

/**
 * Create the title value for a blog post
 */
function createTitleValue(post) {
  const titleLink = `<a href="#${post.key}">${post.title}</a>`;
  const titleHeader = `<h2>${titleLink}</h2>`;
  return `<div class="${CLASS.VALUE}">${titleHeader}</div>`;
}

/**
 * Generate the title section for a blog post
 */
function generateTitleSection(post) {
  const titleClasses = joinClasses([CLASS.KEY, CLASS.ARTICLE_TITLE]);
  const titleKey = createDiv(titleClasses, post.key);
  const titleValue = createTitleValue(post);
  return createPair(titleKey, titleValue);
}

/**
 * Generate the date section for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the date section
 */
function generateDateSection(post) {
  const valueHTML = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(post.publicationDate)}</p>`;
  return createLabeledSection({
    label: 'pubAt',
    valueHTML,
    wrapValueDiv: false,
  });
}

/**
 * Check if post has tags
 * @param {Object} post - The blog post
 * @returns {boolean} - True if post has tags
 */
function hasTags(post) {
  return Array.isArray(post.tags) && post.tags.length > 0;
}

/**
 * Generate the tags section for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the tags section
 */
function generateTagsSection(post) {
  if (!hasTags(post)) {
    return '';
  }
  const tagsContent = post.tags
    .map(tag => {
      const escapedTag = escapeHtml(tag);
      return `<a class="tag-${escapedTag}">${escapedTag}</a>`;
    })
    .join(', ');
  const tagsValue = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${tagsContent}</p>`;
  return createLabeledSection({
    label: 'tags',
    valueHTML: tagsValue,
    wrapValueDiv: false,
  });
}

/**
 * Check if post has the specified media type
 */
// Declarative rules for whether media of a given type should display
const MEDIA_DISPLAY_RULES = {
  illustration: post => Boolean(post.illustration),
  audio: post => Boolean(post.audio),
  youtube: post => Boolean(post.youtube),
};

function shouldDisplayMedia(post, type) {
  const rule = MEDIA_DISPLAY_RULES[type];
  return rule(post);
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if post has related links
 * @param {Object} post - The blog post
 * @returns {boolean} - True if post has related links
 */
function hasRelatedLinks(post) {
  return post.relatedLinks !== undefined && isNonEmptyArray(post.relatedLinks);
}

/**
 * Check if post has tags
 * @param {Object} post - The blog post
 * @returns {boolean} - True if post has tags
 */

/**
 * Generate media content based on media type
 */
function generateMediaContent(post, mediaType) {
  return buildMediaContent(post, mediaType);
}

/**
/**
 * Create illustration image element
 */
function createIllustrationImage(post) {
  // Use fileName if provided, otherwise fall back to publicationDate
  const fileName = post.illustration.fileName || post.publicationDate;
  const src = `${fileName}.${post.illustration.fileType}`;
  const altText = post.illustration.altText;
  return `<img loading="lazy" src="${src}" alt="${altText}"/>`;
}

/**
 * Create audio source element
 */
function createAudioSource(post) {
  const audioSrc = `${post.publicationDate}.${post.audio.fileType}`;
  return `<source src="${audioSrc}">`;
}

/**
 * Create YouTube iframe with proper attributes
 */
function createYouTubeIframe(post) {
  const youtubeId = post.youtube.id;
  const timestamp = post.youtube.timestamp;
  const title = escapeHtml(post.youtube.title);
  return `<iframe height="300px" width="100%" src="https://www.youtube.com/embed/${youtubeId}?start=${timestamp}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe>`;
}

/**
 * Mapping for media sections.
 * Each key maps to a function that generates the corresponding media section.
 */
// Media config: [type, label]
const MEDIA_CONFIG = [
  ['illustration', 'illus'],
  ['audio', 'audio'],
  ['youtube', 'video'],
];

// Declarative mapping for media content rendering
const MEDIA_CONTENT_CONFIG = {
  illustration: { wrapperTag: 'div', fragment: createIllustrationImage },
  audio: { wrapperTag: 'audio', fragment: createAudioSource, controls: true },
  youtube: { wrapperTag: 'p', fragment: createYouTubeIframe },
};

// Generic builder for media content
function buildMediaContent(post, type) {
  const { wrapperTag, fragment, controls } = MEDIA_CONTENT_CONFIG[type];
  const innerHTML = fragment(post);
  let controlsAttr = '';
  if (controls) {
    controlsAttr = ' controls';
  }
  return `<${wrapperTag} class="${CLASS.VALUE}"${controlsAttr}>${innerHTML}</${wrapperTag}>`;
}

// Generic media section builder
function buildMediaSection(post, type, label) {
  if (!shouldDisplayMedia(post, type)) {
    return '';
  }
  return createLabeledSection({
    label,
    valueHTML: generateMediaContent(post, type),
    wrapValueDiv: false,
    keyExtraClasses: CLASS.MEDIA,
  });
}

const MEDIA_SECTIONS = Object.fromEntries(
  MEDIA_CONFIG.map(([type, label]) => [
    type,
    post => buildMediaSection(post, type, label),
  ])
);
/**
 * Generate all media sections for a blog post by iterating over the MEDIA_SECTIONS mapping.
 */
function generateMediaSections(post) {
  const sections = Object.values(MEDIA_SECTIONS).map(generator =>
    generator(post)
  );
  return join(sections);
}

/**
 * Format a related link to display in the list
 * @param {Object} link - The related link object
 * @returns {string} - Formatted HTML for a related link
 */
const DEFAULT_RELATED_LINK_ATTRS = 'target="_blank" rel="noopener"';
function escapeRelatedLinkFields(link) {
  const fields = ['url', 'title', 'author', 'source', 'quote'];
  return fields.reduce(
    (acc, field) => {
      if (link[field]) {
        acc[field] = escapeHtml(link[field]);
      } else {
        acc[field] = '';
      }
      return acc;
    },
    { type: link.type }
  );
}

function prefixIfPresent(prefix, value) {
  if (value) {
    return `${prefix}${value}`;
  } else {
    return '';
  }
}

function formatTitleByType(type, title) {
  const formatters = {
    book: t => `<em>_${t}_</em>`,
    microblog: t => `"${t}"`,
    article: t => `"${t}"`,
    report: t => `"${t}"`,
  };
  let formatter;
  if (formatters[type]) {
    formatter = formatters[type];
  } else {
    formatter = t => t;
  }
  return formatter(title);
}

function formatBaseLink(type, url, title) {
  const formattedTitle = formatTitleByType(type, title);
  return `<a href="${url}" ${DEFAULT_RELATED_LINK_ATTRS}>${formattedTitle}</a>`;
}

function wrapIfPresent(prefix, value, suffix) {
  if (value) {
    return prefix + value + suffix;
  }
}

function createLinkParts(baseLink, { author, source, quote }) {
  return [
    baseLink,
    prefixIfPresent(' by ', author),
    prefixIfPresent(', ', source),
    wrapIfPresent(' ("', quote, '")'),
  ];
}

function composeLinkParts(baseLink, meta) {
  const parts = createLinkParts(baseLink, meta);
  return `<li>${join(parts.filter(Boolean))}</li>`;
}

function formatRelatedLink(link) {
  const { url, title, author, source, quote, type } =
    escapeRelatedLinkFields(link);
  const baseLink = formatBaseLink(type, url, title);
  const linkProperties = { author, source, quote };
  return composeLinkParts(baseLink, linkProperties);
}

/**
 * Generate the related links section for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the related links section
 */
function generateRelatedLinksSection(post) {
  if (!hasRelatedLinks(post)) {
    return '';
  }
  const linksList = post.relatedLinks
    .map(link => formatRelatedLink(link))
    .join('');
  const valueContent = `<ul class="related-links">${linksList}</ul>`;
  return createLabeledSection({ label: 'links', valueHTML: valueContent });
}

/**
 * Check if post has a toy component
 * @param {Object} post - The blog post
 * @returns {boolean} - True if post has a toy component
 */
function allTruthy(obj, fns) {
  return fns.every(fn => Boolean(fn(obj)));
}

function hasToy(post) {
  return allTruthy(post, [
    p => p,
    p => p.toy,
    p => p.toy.modulePath,
    p => p.toy.functionName,
  ]);
}

/**
 * Helper to generate a section with an empty key and a value.
 * @param {string} valueHTML - The HTML for the value div
 * @returns {string} - Section HTML with empty key and value
 */

// Output types for toy dropdown
const TOY_OUTPUT_TYPES = [
  ['text', 'text'],
  ['pre', 'pre'],
  ['tic-tac-toe', 'tic-tac-toe'],
  ['battleship-solitaire-fleet', 'battleship-solitaire-fleet'],
  [
    'battleship-solitaire-clues-presenter',
    'battleship-solitaire-clues-presenter',
  ],
];

// Generic select builder for dropdowns
function buildSelect(selectClass, entries) {
  const options = entries
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
  return `<select class="${selectClass}">${options}</select>`;
}

/**
 * Generate the output section for a toy component
 * @returns {string} - HTML for the output section
 */
function getToyOutputSelectDropdown() {
  return buildSelect('output', TOY_OUTPUT_TYPES);
}

function getToyOutputValueContent() {
  const selectDropdown = getToyOutputSelectDropdown();
  const warningParagraph = '<p>This toy requires Javascript to run.</p>';
  const outputDiv = createDiv('output warning', warningParagraph);
  return selectDropdown + outputDiv;
}

/**
 * Generate script tag to add the component
 * @param {Object} post - The blog post
 * @returns {string} - HTML script tag
 */
function generateToyScript(post) {
  const scriptContent = `window.addComponent('${post.key}', '${post.toy.modulePath}', '${post.toy.functionName}');`;
  return `<script type="module">${scriptContent}</script>`;
}

// Unified toy UI section abstraction
const INPUT_METHODS = ['text', 'number', 'kv', 'dendrite-story'];

/**
 * Build the input dropdown for a toy
 * @param {string} defaultMethod - The configured default input method
 * @returns {string} - HTML for the dropdown and text input
 */
function buildToyInputDropdown(defaultMethod) {
  let selectedMethod;
  if (defaultMethod && defaultMethod !== 'text') {
    selectedMethod = defaultMethod;
  }
  const options = INPUT_METHODS.map(method => {
    let selected = '';
    if (method === selectedMethod) {
      selected = ' selected';
    }
    return `<option value="${method}"${selected}>${method}</option>`;
  }).join('');
  return `<select class="input">${options}</select><input type="text" disabled>`;
}

function getToyUISections(defaultMethod) {
  return [
    ['in', () => buildToyInputDropdown(defaultMethod)],
    ['', () => '<button type="submit" disabled>Submit</button>'],
    ['out', getToyOutputValueContent],
  ];
}

function buildToySection(label, buildHTML) {
  return createLabeledSection({ label, valueHTML: buildHTML() });
}

/**
 * Generate the toy UI components for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the toy UI components
 */
function generateToyUISection(post) {
  if (!hasToy(post)) {
    return '';
  }
  let defaultMethod = 'text';
  if (post.toy && post.toy.defaultInputMethod) {
    defaultMethod = post.toy.defaultInputMethod;
  }
  const sections = getToyUISections(defaultMethod);
  return join(
    sections.map(([label, buildHTML]) => buildToySection(label, buildHTML))
  );
}

/**
 * Generate the toy script section for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the toy script section
 */
function generateToyScriptSection(post) {
  if (!hasToy(post)) {
    return '';
  }
  return generateToyScript(post);
}

/**
 * Get all sections for a blog post article.
 * @param {Object} post - The blog post.
 * @returns {string[]} - An array of HTML sections.
 */
function getArticleSections(post) {
  const headerSection = generateHeaderSection(post);
  const mediaSection = generateMediaSections(post);
  const contentSection = generateContentSections(post);
  const toyUISection = generateToyUISection(post);
  const relatedLinksSection = generateRelatedLinksSection(post);
  const toyScriptSection = generateToyScriptSection(post);
  return [
    headerSection,
    mediaSection,
    contentSection,
    toyUISection,
    relatedLinksSection,
    toyScriptSection,
  ];
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  return join(getArticleSections(post));
}

/**
 * Create blog HTML content array
 */
/**
 * Build the complete HTML content for the blog from header, articles, and footer.
 * @param {string} header - The header HTML.
 * @param {string} articles - The articles HTML.
 * @param {string} footer - The footer HTML.
 * @returns {string} - Combined HTML content.
 */
function getBlogHtmlContent(header, articles, footer) {
  return join([header, articles, footer]);
}

/**
 * Retrieve the HTML for all articles from the blog.
 * @param {Object} blog - The blog object.
 * @returns {string} - Combined HTML for all articles.
 */
function getArticles(blog) {
  return generateArticles(blog.posts);
}

/**
 * Assemble the blog HTML content by combining header, articles, and footer.
 * @param {string} header - The header HTML.
 * @param {Object} blog - The blog object.
 * @param {string} footer - The footer HTML.
 * @returns {string} - The combined HTML content.
 */
function assembleBlogHTML(header, blog, footer) {
  const articles = getArticles(blog);
  return getBlogHtmlContent(header, articles, footer);
}

export function generateBlog(parts, wrapHtml) {
  const { blog, header, footer } = parts;
  const htmlContents = assembleBlogHTML(header, blog, footer);
  return wrapHtml(htmlContents);
}

const createBlogComponents = () => ({
  header: createPageHeader(),
  footer: createPageFooter(),
  wrapFunc: wrapHtml,
});

/**
 * Extracts the blog generation arguments from the blog components.
 * @returns {Object} - An object containing header, footer, and wrapFunc.
 */
export function getBlogGenerationArgs() {
  const components = createBlogComponents();
  const { header, footer, wrapFunc } = components;
  return { header, footer, wrapFunc };
}

export const generateBlogOuter = blog => {
  const { header, footer, wrapFunc } = getBlogGenerationArgs();
  return generateBlog({ blog, header, footer }, wrapFunc);
};
