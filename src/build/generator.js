import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import { headerBanner } from './title.js';
import { createNavbar, createLinksBar } from './navbar.js';
import {
  createTag,
  createAttrPair,
  escapeHtml,
  wrapHtml,
  join,
  attrName,
} from './html.js';

/**
 * Wrap a string or array of strings in paragraph tags.
 * @param {string|string[]} content - Text or an array of text paragraphs.
 * @returns {string} HTML string containing one or more <p> elements.
 */
function createParagraphs(content) {
  if (Array.isArray(content)) {
    return content.map(para => `<p>${para}</p>`).join('');
  } else {
    return `<p>${content}</p>`;
  }
}

/**
 * Create a blockquote element containing the provided text content.
 * @param {string|string[]} content - Text or paragraphs for the blockquote.
 * @returns {string} HTML blockquote element.
 */
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
 * Return the CSS class for a key element.
 * @param {string} [keyExtraClasses] - Optional extra CSS classes.
 * @returns {string} Computed class string.
 */
function getKeyClass(keyExtraClasses) {
  if (keyExtraClasses) {
    return `${CLASS.KEY} ${keyExtraClasses}`;
  }
  return CLASS.KEY;
}

/**
 * Combine a key div and value HTML into a labeled section pair.
 * @param {string} keyDiv - HTML for the key element.
 * @param {string} valueHTML - HTML for the value element.
 * @param {boolean} wrapValueDiv - Whether to wrap the value in a div.
 * @returns {string} Combined HTML pair.
 */
function buildLabeledSectionPair(keyDiv, valueHTML, wrapValueDiv) {
  const valuePart = labeledSectionValuePart(valueHTML, wrapValueDiv);
  return createPair(keyDiv, valuePart);
}

/**
 * Ensure that `wrapValueDiv` is defined on the args object.
 * @param {object} args - Options for creating a labeled section.
 * @param {boolean} [args.wrapValueDiv] - Whether to wrap value HTML in a div.
 * @returns {object} Args object with wrapValueDiv defaulted to true if undefined.
 */
function defaultWrapValueDiv(args) {
  if (args.wrapValueDiv === undefined) {
    args.wrapValueDiv = true;
  }
  return args;
}

/**
 * Ensure that `keyExtraClasses` exists on the args object.
 * @param {object} args - Options for creating a labeled section.
 * @param {string} [args.keyExtraClasses] - Additional CSS classes for the key div.
 * @returns {object} Args object with keyExtraClasses defaulted to empty string.
 */
export function defaultKeyExtraClasses(args) {
  if (args.keyExtraClasses === undefined) {
    args.keyExtraClasses = '';
  }
  return args;
}

/**
 * Apply default values for labeled section options.
 * @param {object} args - Options for creating a labeled section.
 * @returns {object} Args object with defaults applied.
 */
function applyLabeledSectionDefaults(args) {
  return defaultKeyExtraClasses(defaultWrapValueDiv(args));
}

/**
 * Convert labeled section options into explicit arguments.
 * @param {object} args - Options object for labeled section creation.
 * @returns {{keyDiv: string, valueHTML: string, wrapValueDiv: boolean}}
 *   Prepared arguments for section creation.
 */
function prepareLabeledSectionArgs(args) {
  const { label, valueHTML, wrapValueDiv, keyExtraClasses } =
    applyLabeledSectionDefaults(args);
  const keyClass = getKeyClass(keyExtraClasses);
  const keyDiv = createDiv(keyClass, label);
  return { keyDiv, valueHTML, wrapValueDiv };
}

/**
 * Build a labeled section from the provided options.
 * @param {object} args - Section creation options.
 * @param {string} args.label - Text label for the key.
 * @param {string} args.valueHTML - HTML for the value element.
 * @param {boolean} [args.wrapValueDiv] - Whether to wrap the value in a div.
 * @param {string} [args.keyExtraClasses] - Extra classes for the key div.
 * @returns {string} Labeled section HTML.
 */
function createLabeledSection(args) {
  const { keyDiv, valueHTML, wrapValueDiv } = prepareLabeledSectionArgs(args);
  return buildLabeledSectionPair(keyDiv, valueHTML, wrapValueDiv);
}

/**
 * Optionally wrap value HTML in a value div.
 * @param {string} valueHTML - Value HTML to wrap.
 * @param {boolean} wrapValueDiv - Whether to wrap in a div.
 * @returns {string} Wrapped or raw value HTML.
 */
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
const BIO_TEXT = `Software developer and philosopher in Berlin`;

/**
 * Build the HTML for the page header section.
 * @returns {string} HTML representing the header section.
 */
function createHeaderContent() {
  const banner = createLabeledSection({
    label: '',
    valueHTML: createValueDiv(headerBanner()),
    wrapValueDiv: false,
  });
  const bio = createLabeledSection({
    label: 'bio',
    valueHTML: `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${BIO_TEXT}</p>`,
    wrapValueDiv: true,
  });
  return join([banner, bio]);
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
 * Create the opening tag for the container div.
 * @returns {string} Opening div tag with container ID.
 */
function createContainerDivOpen() {
  const idAttr = createAttrPair(attrName().ID, CONTAINER_ID);
  return `<${DIV_TAG_NAME} ${idAttr}>`;
}

/**
 * Compose the array of HTML fragments for the page header.
 * @param {string} headerElement - The already generated header section.
 * @returns {string[]} Array of HTML fragments.
 */
function createHeaderContentArray(headerElement) {
  return [
    headElement(),
    '<body>',
    createContainerDivOpen(),
    '<!-- Header -->',
    headerElement,
    '<!-- Navigation -->',
    createLinksBar(),
    createNavbar(),
  ];
}

/**
 * Generate the HTML for the beginning of the page including the header.
 * @returns {string} Combined HTML for the head, opening body tag and header.
 */
function createPageHeader() {
  const headerElement = createHeaderSection();
  const contentArray = createHeaderContentArray(headerElement);
  return contentArray.join('');
}

/**
 * Create the closing container div.
 * @returns {string} Closing div tag.
 */
function createContainerDivClose() {
  return '</div>';
}

/**
 * Return the closing body tag.
 * @returns {string} </body> tag
 */
function createBodyClose() {
  return '</body>';
}

/**
 * Compose HTML fragments for the page footer section.
 * @param {string} footerElement - The generated footer section.
 * @returns {string[]} Array of HTML fragments for the footer.
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
 * Create the HTML that closes the page with footer and scripts.
 * @returns {string} HTML string for the page footer.
 */
function createPageFooter() {
  const footerElement = createFooterSection();
  const contentArray = createFooterContentArray(footerElement);
  return contentArray.join('');
}

/**
 * Convert a blog post object to an article HTML string.
 * @param {object} post - Blog post data.
 * @returns {string} HTML article.
 */
function convertPostToArticleHTML(post) {
  return generateArticle(post);
}

/**
 * Optionally format article HTML. Currently a passthrough.
 * @param {string} articleHTML - Raw article HTML.
 * @returns {string} Formatted article HTML.
 */
function formatArticleHTML(articleHTML) {
  return articleHTML;
}

/**
 * Convert an array of posts to concatenated article HTML.
 * @param {object[]} posts - Array of post objects.
 * @returns {string} Combined HTML for all posts.
 */
function processPostsToHTML(posts) {
  return posts.map(convertPostToArticleHTML).map(formatArticleHTML).join('');
}

/**
 * Generate HTML for all articles in the blog.
 * @param {object[]} posts - Array of post objects.
 * @returns {string} Combined article HTML.
 */
function generateArticles(posts) {
  return processPostsToHTML(posts);
}

/**
 * Create an id attribute if the post has a key.
 * @param {object} post - Blog post data.
 * @returns {string} id attribute string including leading space.
 */
export function createIdAttributeIfNeeded(post) {
  return ` ${createAttrPair(attrName().ID, post.key)}`;
}

/**
 * Derive tag class names for a post.
 * @param {object} post - Blog post data.
 * @returns {string[]} Array of tag class names.
 */
function getTagClassList(post) {
  if (hasTags(post)) {
    return post.tags.map(tag => `tag-${tag}`);
  } else {
    return [];
  }
}

/**
 * Build the class attribute for an article element.
 * @param {object} post - Blog post data.
 * @returns {string} class attribute pair.
 */
function createArticleClassAttr(post) {
  const classes = [CLASS.ENTRY, ...getTagClassList(post)];
  if (post.release === 'beta') {
    classes.push('release-beta');
  }
  const classValue = joinClasses(classes);
  return createAttrPair(attrName().CLASS, classValue);
}

/**
 * Compose the attributes string for an article element.
 * @param {object} post - Blog post data.
 * @returns {string} Combined class and id attributes.
 */
function createArticleAttributes(post) {
  const classAttr = createArticleClassAttr(post);
  const idAttr = createIdAttributeIfNeeded(post);
  return `${classAttr}${idAttr}`;
}

/**
 * Prefix article content with a full-width layout element.
 * @param {string} content - Article content HTML.
 * @returns {string} Formatted content HTML.
 */
function formatArticleContent(content) {
  return `${fullWidthElement()}${content}`;
}

/**
 * Create an <article> element string from a blog post object.
 * @param {object} post - Blog post data.
 * @returns {string} Article HTML.
 */
function generateArticle(post) {
  const content = generateArticleContent(post);
  const formattedContent = formatArticleContent(content);
  const attributes = createArticleAttributes(post);
  return createTag(ARTICLE_TAG_NAME, attributes, formattedContent);
}

/**
 * Get the content array from a post, defaulting to an empty array.
 * @param {object} post - Blog post.
 * @returns {Array} Content array.
 */
function getContentArray(post) {
  return post.content || [];
}

/**
 * Determine if a content index corresponds to the first item.
 * @param {number} index - Index within the content array.
 * @returns {boolean} True if first item.
 */
function isFirstContentItem(index) {
  return index === 0;
}

/**
 * Create a content section item with index awareness.
 * @param {string|object} text - Content item.
 * @param {number} index - Index in the content array.
 * @returns {string} Section HTML for the content item.
 */
function createContentItemWithIndex(text, index) {
  const isFirst = isFirstContentItem(index);
  return createContentSectionItem(text, isFirst);
}

/**
 * Normalize a content item.
 * If content is already an object, return it unchanged;
 * otherwise, wrap it in an object with type 'text' and content fields.
 * @param {object | string} content - The content item to normalize.
 * @returns {object} - Normalized content object.
 */
/**
 * @typedef {object} NormalizedContent
 * @property {string} type - The normalized content type.
 * @property {*} content - The normalized content data.
 */

/**
 * @typedef {object} ContentTypeHandler
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

/**
 * Wrap plain text in a paragraph element.
 * @param {string} content - The text content to wrap.
 * @returns {string} HTML paragraph string.
 */
function renderAsParagraph(content) {
  return `<p class="${CLASS.VALUE}">${content}</p>`;
}

/**
 * Create a content section item with exact formatting
 * @param {object | string} content - The content object or text
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
 * Generate the HTML sections for all content items in a post.
 * @param {object} post - The blog post.
 * @returns {string} HTML for the content sections.
 */
function generateContentSections(post) {
  const contentArray = getContentArray(post);
  const contentItems = contentArray.map(createContentItemWithIndex);
  return join(contentItems);
}

const HEADER_SECTIONS_CONFIG = [
  {
    condition: () => true,
    generator: post => {
      const titleClasses = joinClasses([CLASS.KEY, CLASS.ARTICLE_TITLE]);
      const titleKey = createDiv(titleClasses, post.key);
      const titleLink = `<a href="#${post.key}">${post.title}</a>`;
      const titleHeader = `<h2>${titleLink}</h2>`;
      const titleValue = `<div class="${CLASS.VALUE}">${titleHeader}</div>`;
      return createPair(titleKey, titleValue);
    },
  },
  {
    condition: post => post.publicationDate,
    generator: post => {
      const valueHTML = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(
        post.publicationDate
      )}</p>`;
      return createLabeledSection({
        label: 'pubAt',
        valueHTML,
        wrapValueDiv: false,
      });
    },
  },
  {
    condition: post => hasTags(post),
    generator: post => {
      const tagLinks = post.tags
        .map(tag => {
          const escapedTag = escapeHtml(tag);
          return `<a class="tag-${escapedTag}">${escapedTag}</a>`;
        })
        .join(', ');
      const valueHTML = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${tagLinks}</p>`;
      return createLabeledSection({
        label: 'tags',
        valueHTML,
        wrapValueDiv: false,
      });
    },
  },
];

/**
 * Build the header section for a blog post.
 * @param {object} post - The blog post.
 * @returns {string} HTML for the header section.
 */
function generateHeaderSection(post) {
  return HEADER_SECTIONS_CONFIG.filter(section => section.condition(post))
    .map(section => section.generator(post))
    .join('');
}

/**
 * Check if post has tags
 * @param {object} post - The blog post
 * @returns {boolean} - True if post has tags
 */
function hasTags(post) {
  return Array.isArray(post.tags) && post.tags.length > 0;
}

/**
 * Check if post has the specified media type
 */
const MEDIA_SECTIONS_CONFIG = [
  {
    label: 'illus',
    condition: post => post.illustration,
    content: post => {
      const { fileName, fileType, altText } = post.illustration;
      const src = `${fileName || post.publicationDate}.${fileType}`;
      return `<img loading="lazy" src="${src}" alt="${escapeHtml(altText)}"/>`;
    },
    keyExtraClasses: CLASS.MEDIA,
  },
  {
    label: 'audio',
    condition: post => post.audio,
    content: post => {
      const audioSrc = `${post.publicationDate}.${post.audio.fileType}`;
      return `<audio class="${CLASS.VALUE}" controls><source src="${audioSrc}"></audio>`;
    },
    wrapValueDiv: false, // The <audio> tag itself serves as the value container
    keyExtraClasses: CLASS.MEDIA,
  },
  {
    label: 'video',
    condition: post => post.youtube,
    content: post => {
      const { id, timestamp, title } = post.youtube;
      return `<p class="${
        CLASS.VALUE
      }"><iframe height="300px" width="100%" src="https://www.youtube.com/embed/${id}?start=${timestamp}" title="${escapeHtml(
        title || ''
      )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></p>`;
    },
    wrapValueDiv: false, // The <p> tag is already included in the content
    keyExtraClasses: CLASS.MEDIA,
  },
];

/**
 * Generate HTML for any available media sections of the given post.
 * @param {object} post - The blog post data.
 * @returns {string} The HTML markup for media sections.
 */
function generateMediaSections(post) {
  return MEDIA_SECTIONS_CONFIG.map(section => {
    if (section.condition(post)) {
      return createLabeledSection({
        label: section.label,
        valueHTML: section.content(post),
        wrapValueDiv: section.wrapValueDiv !== false,
        keyExtraClasses: section.keyExtraClasses,
      });
    }
    return '';
  }).join('');
}

/**
 * Check if the provided value is a non-empty array.
 * @param {*} value - Value to test.
 * @returns {boolean} True if value is an array with elements.
 */
function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if post has related links
 * @param {object} post - The blog post
 * @returns {boolean} - True if post has related links
 */
function hasRelatedLinks(post) {
  return post.relatedLinks !== undefined && isNonEmptyArray(post.relatedLinks);
}

/**
 * Format a related link to display in the list
 * @param {object} link - The related link object
 * @returns {string} - Formatted HTML for a related link
 */
const DEFAULT_RELATED_LINK_ATTRS = 'target="_blank" rel="noopener"';
/**
 * Escape user provided link fields.
 * @param {object} link - Raw link information.
 * @returns {object} Link object with escaped fields.
 */
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

/**
 * Prepend a prefix if the value exists.
 * @param {string} prefix - Prefix text.
 * @param {string} value - Value text.
 * @returns {string|undefined} Prefixed string or undefined.
 */
function prefixIfPresent(prefix, value) {
  if (value) {
    return `${prefix}${value}`;
  }
  return undefined;
}

/**
 * Format a link title depending on its type.
 * @param {string} type - Link type identifier.
 * @param {string} title - Link title.
 * @returns {string} Formatted title string.
 */
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

/**
 * Format the basic `<a>` element for a related link.
 * @param {string} type - Link type.
 * @param {string} url - URL for the link.
 * @param {string} title - Link title.
 * @returns {string} HTML anchor element.
 */
function formatBaseLink(type, url, title) {
  const formattedTitle = formatTitleByType(type, title);
  return `<a href="${url}" ${DEFAULT_RELATED_LINK_ATTRS}>${formattedTitle}</a>`;
}

/**
 * Wrap a value with prefix and suffix when present.
 * @param {string} prefix - Prefix text.
 * @param {string} value - Value text.
 * @param {string} suffix - Suffix text.
 * @returns {string|undefined} Wrapped string or undefined.
 */
function wrapIfPresent(prefix, value, suffix) {
  if (value) {
    return prefix + value + suffix;
  }
  return undefined;
}

/**
 * Build all parts of a related link list item.
 * @param {string} baseLink - Base anchor element.
 * @param {{author?:string, source?:string, quote?:string}} root0 - Link metadata.
 * @returns {Array<string|undefined>} Array of link parts.
 */
function createLinkParts(baseLink, { author, source, quote }) {
  return [
    baseLink,
    prefixIfPresent(' by ', author),
    prefixIfPresent(', ', source),
    wrapIfPresent(' ("', quote, '")'),
  ];
}

/**
 * Combine link parts into an HTML list item.
 * @param {string} baseLink - Base anchor element.
 * @param {object} meta - Link metadata.
 * @returns {string} HTML list item string.
 */
function composeLinkParts(baseLink, meta) {
  const parts = createLinkParts(baseLink, meta);
  return `<li>${join(parts.filter(Boolean))}</li>`;
}

/**
 * Format a related link object into an HTML list item.
 * @param {object} link - The related link data.
 * @returns {string} HTML list item string.
 */
function formatRelatedLink(link) {
  const { url, title, author, source, quote, type } =
    escapeRelatedLinkFields(link);
  const baseLink = formatBaseLink(type, url, title);
  const linkProperties = { author, source, quote };
  return composeLinkParts(baseLink, linkProperties);
}

/**
 * Generate the related links section for a blog post
 * @param {object} post - The blog post
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
 * Return true if every predicate returns truthy for the provided object.
 * @param {object} obj - Value to test.
 * @param {Function[]} fns - Predicate functions.
 * @returns {boolean} Whether all predicates returned truthy.
 */
function allTruthy(obj, fns) {
  return fns.every(fn => Boolean(fn(obj)));
}

/**
 * Check whether a post has a configured toy component.
 * @param {object} post - The blog post.
 * @returns {boolean} True if a toy is configured.
 */
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
/**
 * Build a `<select>` element from entries.
 * @param {string} selectClass - CSS class for the select element.
 * @param {Array<[string,string]>} entries - Value/label pairs.
 * @returns {string} HTML select element.
 */
function buildSelect(selectClass, entries) {
  const options = entries
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
  return `<select class="${selectClass}">${options}</select>`;
}

/**
 * Build the toy output selection dropdown.
 * @returns {string} HTML select element.
 */
function getToyOutputSelectDropdown() {
  return buildSelect('output', TOY_OUTPUT_TYPES);
}

/**
 * Build the default toy output container markup.
 * @returns {string} HTML for the output container.
 */
function getToyOutputValueContent() {
  const selectDropdown = getToyOutputSelectDropdown();
  const warningParagraph = '<p>This toy requires Javascript to run.</p>';
  const outputDiv = createDiv('output warning', warningParagraph);
  return selectDropdown + outputDiv;
}

/**
 * Generate script tag to add the component
 * @param {object} post - The blog post
 * @returns {string} - HTML script tag
 */
function generateToyScript(post) {
  const scriptContent = `window.addComponent('${post.key}', '${post.toy.modulePath}', '${post.toy.functionName}');`;
  return `<script type="module">${scriptContent}</script>`;
}

// Unified toy UI section abstraction
const INPUT_METHODS = [
  'text',
  'textarea',
  'number',
  'kv',
  'dendrite-story',
  'dendrite-page',
  'moderator-ratings',
];

/**
 * Build the input dropdown for a toy
 * @param {string} defaultMethod - The configured default input method
 * @returns {string} - HTML for the dropdown and text input
 */
export function getSelectedMethod(defaultMethod) {
  if (defaultMethod === 'text') {
    return undefined;
  }
  return defaultMethod;
}

/**
 * Build an `<option>` element.
 * @param {string} method - Input method value.
 * @param {string|undefined} selectedMethod - Currently selected method.
 * @returns {string} HTML option element.
 */
function buildOption(method, selectedMethod) {
  let selected = '';
  if (method === selectedMethod) {
    selected = ' selected';
  }
  return `<option value="${method}"${selected}>${method}</option>`;
}

/**
 * Build the input dropdown for a toy.
 * @param {string} defaultMethod - Default input method.
 * @returns {string} HTML select + input element.
 */
function buildToyInputDropdown(defaultMethod) {
  const selectedMethod = getSelectedMethod(defaultMethod);
  const options = INPUT_METHODS.map(method =>
    buildOption(method, selectedMethod)
  ).join('');
  return `<select class="input">${options}</select><input type="text" disabled>`;
}

const TOY_UI_SECTIONS_CONFIG = [
  {
    label: 'in',
    content: defaultMethod => buildToyInputDropdown(defaultMethod),
  },
  {
    label: '',
    content: () => '<button type="submit" disabled>Submit</button>',
  },
  {
    label: 'out',
    content: () => getToyOutputValueContent(),
  },
];

/**
 * Determine if a toy section should be skipped.
 * @param {object} post - The blog post.
 * @returns {boolean} True if the post has no toy.
 */
function shouldSkipToy(post) {
  return !hasToy(post);
}

/**
 * Retrieve the configured default input method for a post.
 * @param {object} post - The blog post.
 * @returns {string} Method name.
 */
export function getDefaultInputMethod(post) {
  const toy = post.toy ?? { defaultInputMethod: 'text' };
  return toy.defaultInputMethod;
}

/**
 * Generate the toy UI components for a blog post.
 * @param {object} post - The blog post.
 * @returns {string} HTML for the toy UI components.
 */
function generateToyUISection(post) {
  if (shouldSkipToy(post)) {
    return '';
  }
  const defaultMethod = getDefaultInputMethod(post);
  const sections = TOY_UI_SECTIONS_CONFIG.map(section => {
    const valueHTML = section.content(defaultMethod);
    return createLabeledSection({ label: section.label, valueHTML });
  });
  return join(sections);
}

/**
 * Generate the script element to load a toy component.
 * @param {object} post - The blog post.
 * @returns {string} HTML script tag or empty string.
 */
function generateToyScriptSection(post) {
  if (!hasToy(post)) {
    return '';
  }
  return generateToyScript(post);
}

/**
 * Get all sections for a blog post article.
 * @param {object} post - The blog post.
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
 * Generate the HTML content for a single blog post.
 * @param {object} post - The blog post.
 * @returns {string} HTML for the article.
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
 * @param {object} blog - The blog object.
 * @returns {string} - Combined HTML for all articles.
 */
function getArticles(blog) {
  return generateArticles(blog.posts);
}

/**
 * Assemble the blog HTML content by combining header, articles, and footer.
 * @param {string} header - The header HTML.
 * @param {object} blog - The blog object.
 * @param {string} footer - The footer HTML.
 * @returns {string} - The combined HTML content.
 */
function assembleBlogHTML(header, blog, footer) {
  const articles = getArticles(blog);
  return getBlogHtmlContent(header, articles, footer);
}

/**
 * Generate the complete blog HTML.
 * @param {{blog: object, header: string, footer: string}} parts - Blog pieces.
 * @param {Function} wrapHtml - Wrapper function for the final HTML.
 * @returns {string} Full blog HTML.
 */
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
 * @returns {object} - An object containing header, footer, and wrapFunc.
 */
export function getBlogGenerationArgs() {
  const components = createBlogComponents();
  const { header, footer, wrapFunc } = components;
  return { header, footer, wrapFunc };
}

/**
 * Convenience wrapper to generate a blog from a blog object.
 * @param {object} blog - Blog data object.
 * @returns {string} Complete blog HTML.
 */
export const generateBlogOuter = blog => {
  const { header, footer, wrapFunc } = getBlogGenerationArgs();
  return generateBlog({ blog, header, footer }, wrapFunc);
};
