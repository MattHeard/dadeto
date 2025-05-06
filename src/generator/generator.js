/**
 * Create paragraphs HTML string.
 * @param {string|string[]} content - A string or an array of strings.
 * @returns {string} - HTML string composed of paragraph elements.
 */
function createParagraphs(content) {
  if (Array.isArray(content)) {
    return content.map(para => `<p>${para}</p>`).join('');
  } else {
    return `<p>${content}</p>`;
  }
}

/**
 * Create a blockquote HTML string.
 * @param {string|string[]} content - A string or an array of strings.
 * @returns {string} - The blockquote HTML.
 */
function createBlockquote(content) {
  return `<blockquote class="${CLASS.VALUE}">${BLOCKQUOTE_CORNERS}${createParagraphs(content)}</blockquote>`;
}
import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import { HEADER_BANNER } from './title.js';
import {
  createTag,
  createAttrPair,
  escapeHtml,
  wrapHtml,
  join,
  ATTR_NAME,
} from './html.js';

// CSS class names
const CLASS = {
  KEY: 'key',
  VALUE: 'value',
  ENTRY: 'entry',
  ARTICLE_TITLE: 'article-title',
  METADATA: 'metadata',
  FOOTER: 'footer',
  WARNING: 'warning',
  MEDIA: 'media',
  FULL_WIDTH: 'full-width',
};

const BLOCKQUOTE_CORNERS = `<div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div>`;

// HTML tag names
const DIV_TAG_NAME = 'div';
const ARTICLE_TAG_NAME = 'article';

// Date formatting constants
const DATE_LOCALE = 'en-GB';
const DATE_FORMAT_OPTIONS = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

// Container ID
const CONTAINER_ID = 'container';

// HTML generation helpers

/**
 * Create a div element with specified classes and content
 * @param {string} classes - CSS classes to apply to the div
 * @param {string} content - HTML content to place inside the div
 * @returns {string} - HTML div element
 */
function createDiv(classes, content) {
  const classAttr = createAttrPair(ATTR_NAME.CLASS, classes);
  return createTag(DIV_TAG_NAME, classAttr, content);
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
  const classes = [CLASS.VALUE, ...additionalClasses].filter(Boolean);
  const joinedClasses = joinClasses(classes);
  return createDiv(joinedClasses, content);
}

/**
 * Create an array with two parts for joining
 * @param {string} first - The first part
 * @param {string} second - The second part
 * @returns {Array<string>} - Array containing both parts
 */
function createParts(first, second) {
  return [first, second];
}

/**
 * Create a pair with two elements
 * @param {string} first - The first element
 * @param {string} second - The second element
 * @returns {string} - Combined HTML without newlines
 */
function createPair(first, second) {
  const parts = createParts(first, second);
  return join(parts);
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
function createEmptyKeyDiv() {
  return createDiv(CLASS.KEY, '');
}

function prefixWithEmptyKey(valueDiv) {
  const emptyKeyDiv = createEmptyKeyDiv();
  return createPair(emptyKeyDiv, valueDiv);
}

/**
 * Create the content for the header section
 */
function createHeaderContent() {
  const valueDivs = [
    createValueDiv(HEADER_BANNER),
    createValueDiv(METADATA_TEXT, [CLASS.METADATA])
  ];

  const parts = valueDivs.map(prefixWithEmptyKey);

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
  return prefixWithEmptyKey(footerDiv);
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
  const idAttr = createAttrPair(ATTR_NAME.ID, CONTAINER_ID);
  return `<${DIV_TAG_NAME} ${idAttr}>`;
}

/**
 * Create the header content array
 */
function createHeaderContentArray(headerElement) {
  return [
    headElement,
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
    '<script type="module" src="main.js" defer></script>',
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
  return posts.map(convertPostToArticleHTML)
              .map(formatArticleHTML)
              .join('');
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
  return ' ' + createAttrPair(ATTR_NAME.ID, post.key);
}

function getTagClassList(post) {
  return hasTags(post) ? post.tags.map(tag => `tag-${tag}`) : [];
}

function createArticleClassAttr(post) {
  const classes = [CLASS.ENTRY, ...getTagClassList(post)];
  const classValue = joinClasses(classes);
  return createAttrPair(ATTR_NAME.CLASS, classValue);
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
  return `${fullWidthElement}${content}`;
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

function isTextContent(content) {
  return typeof content !== 'object' || content === null;
}

/**
 * Normalize a content item.
 * If content is already an object, return it unchanged;
 * otherwise, wrap it in an object with type 'text' and content fields.
 * @param {Object|string} content - The content item to normalize.
 * @returns {Object} - Normalized content object.
 */
function normalizeContentItem(content) {
  return isTextContent(content) ? { type: 'text', content } : content;
}

/**
 * Mapping of content types to their renderer functions.
 */
const CONTENT_RENDERERS = {
  quote: createBlockquote,
};

function renderValueDiv(normalizedContent) {
  const { type, content } = normalizedContent;

  if (shouldRenderAsBlockquote(type, content)) {
    return CONTENT_RENDERERS.quote(content);
  }

  return renderAsParagraph(content);
}

function isArrayTextQuote(type, content) {
  return type === 'text' && Array.isArray(content);
}

function shouldRenderAsBlockquote(type, content) {
  return type === 'quote' || isArrayTextQuote(type, content);
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
  const key = isFirst ? 'text' : '';
  const keyDiv = createDiv(CLASS.KEY, key);
  const valueDiv = renderValueDiv(normalizedContent);

  return formatSection(keyDiv, valueDiv);
}

/**
 * Generate the text content sections for a blog post
 */
function generateContentSections(post) {
  const contentArray = getContentArray(post);

  const contentItems = contentArray.map(createContentItemWithIndex);

  return combineHTMLSections(...contentItems);
}

/**
 * Generate header section for a blog post
 */
function generateHeaderSection(post) {
  const titleSection = generateTitleSection(post);
  const dateSection = generateDateSection(post);
  const tagsSection = generateTagsSection(post);

  return combineHTMLSections(titleSection, dateSection, tagsSection);
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
 */
function generateDateSection(post) {
  const dateKey = createDiv(CLASS.KEY, 'pubAt');
  const dateValue = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(post.publicationDate)}</p>`;

  return createPair(dateKey, dateValue);
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

  const tagsKey = createDiv(CLASS.KEY, 'tags');
  const tagsContent = post.tags.map(tag => {
    const escapedTag = escapeHtml(tag);
    return `<a class="tag-${escapedTag}">${escapedTag}</a>`;
  }).join(', ');
  const tagsValue = `<p class="${CLASS.VALUE} ${CLASS.METADATA}">${tagsContent}</p>`;

  return createPair(tagsKey, tagsValue);
}

/**
 * Check if post has the specified media type
 */
function hasMediaType(post, mediaType) {
  return Boolean(post[mediaType]);
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
function hasTags(post) {
  return Array.isArray(post.tags) && post.tags.length > 0;
}

/**
 * Check if post either is YouTube content or has a publication date
 */
function isValidMediaType(post, mediaType) {
  return mediaType === 'youtube' || post.publicationDate;
}

/**
 * Check if media should be displayed
 */
function shouldDisplayMedia(post, mediaType) {
  return hasMediaType(post, mediaType) && isValidMediaType(post, mediaType);
}

/**
 * Create a key div for media sections
 */
function createMediaKeyDiv(label) {
  const classes = `${CLASS.KEY} ${CLASS.MEDIA}`;
  return createDiv(classes, label);
}

/**
 * Format a section with key and value divs
 * @param {string} keyDiv - The key div HTML
 * @param {string} valueDiv - The value div HTML
 * @returns {string} - Formatted section HTML
 */
function formatSection(keyDiv, valueDiv) {
  return `${keyDiv}${valueDiv}`;
}

/**
 * Generate media content based on media type
 */
function generateMediaContent(post, mediaType) {
  const generators = {
    illustration: createIllustrationContent,
    audio: createAudioContent,
    youtube: createYouTubeContent
  };

  return generators[mediaType](post);
}

/**
 * Higher-order function for generating media sections
 */
function createMediaSectionGenerator(mediaType, label) {
  return function (post) {
    if (!shouldDisplayMedia(post, mediaType)) {
      return '';
    }

    const keyDiv = createMediaKeyDiv(label);
    const valueDiv = generateMediaContent(post, mediaType);

    return formatSection(keyDiv, valueDiv);
  };
}

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
 * Create illustration content
 */
function createIllustrationContent(post) {
  const image = createIllustrationImage(post);

  return `<div class="${CLASS.VALUE}">${image}</div>`;
}

/**
 * Create audio source element
 */
function createAudioSource(post) {
  const audioSrc = `${post.publicationDate}.${post.audio.fileType}`;
  return `<source src="${audioSrc}">`;
}

/**
 * Create audio content
 */
function createAudioContent(post) {
  const source = createAudioSource(post);

  return `<audio class="${CLASS.VALUE}" controls>${source}</audio>`;
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
 * Create YouTube content
 */
function createYouTubeContent(post) {
  const iframe = createYouTubeIframe(post);

  return `<p class="${CLASS.VALUE}">${iframe}</p>`;
}


/**
 * Mapping for media sections.
 * Each key maps to a function that generates the corresponding media section.
 */
const MEDIA_SECTIONS = {
  illustration: createMediaSectionGenerator('illustration', 'illus'),
  audio: createMediaSectionGenerator('audio', 'audio'),
  youtube: createMediaSectionGenerator('youtube', 'video'),
};

/**
 * Generate all media sections for a blog post by iterating over the MEDIA_SECTIONS mapping.
 */
function generateMediaSections(post) {
  const sections = Object.values(MEDIA_SECTIONS).map(generator => generator(post));
  return combineHTMLSections(...sections);
}

/**
 * Format a related link to display in the list
 * @param {Object} link - The related link object
 * @returns {string} - Formatted HTML for a related link
 */
const DEFAULT_RELATED_LINK_ATTRS = 'target="_blank" rel="noopener"';

function escapeRelatedLinkFields(link) {
  const fields = ['url', 'title', 'author', 'source', 'quote'];

  return fields.reduce((acc, field) => {
    acc[field] = link[field] ? escapeHtml(link[field]) : '';
    return acc;
  }, { type: link.type });
}

function formatTitleByType(type, title) {
  const formatters = {
    book: t => `<em>_${t}_</em>`,
    microblog: t => `"${t}"`,
    article: t => `"${t}"`,
    report: t => `"${t}"`
  };

  return (formatters[type] || (t => t))(title);
}

function formatBaseLink(type, url, title) {
  const formattedTitle = formatTitleByType(type, title);
  return `<a href="${url}" ${DEFAULT_RELATED_LINK_ATTRS}>${formattedTitle}</a>`;
}

function joinLinkParts(parts) {
  return parts.filter(Boolean).join('');
}

function formatAuthor(author) {
  return author ? ` by ${author}` : '';
}

function formatSource(source) {
  return source ? `, ${source}` : '';
}

function formatQuote(quote) {
  return quote ? ` ("${quote}")` : '';
}

function createLinkParts(baseLink, { author, source, quote }) {
  return [
    baseLink,
    formatAuthor(author),
    formatSource(source),
    formatQuote(quote)
  ];
}

function composeLinkParts(baseLink, meta) {
  const parts = createLinkParts(baseLink, meta);
  return `<li>${joinLinkParts(parts)}</li>`;
}

function formatRelatedLink(link) {
  const { url, title, author, source, quote, type } = escapeRelatedLinkFields(link);
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

  const keyDiv = createDiv(CLASS.KEY, 'links');
  // Join with an empty string to avoid spacing issues in the HTML output
  const linksList = post.relatedLinks.map(link => formatRelatedLink(link)).join('');
  const valueContent = `<ul class="related-links">${linksList}</ul>`;
  const valueDiv = createDiv(CLASS.VALUE, valueContent);

  return formatSection(keyDiv, valueDiv);
}

/**
 * Combine multiple HTML sections into a single string
 */
function combineHTMLSections(...sections) {
  return sections.join('');
}

function extractModulePath(toy) {
  return toy?.modulePath;
}

function getModulePath(post) {
  return extractModulePath(post?.toy);
}

function extractFunctionName(toy) {
  return toy?.functionName;
}

function getFunctionName(post) {
  return extractFunctionName(post?.toy);
}

function hasModulePath(post) {
  return Boolean(getModulePath(post));
}

function hasFunctionName(post) {
  return Boolean(getFunctionName(post));
}

/**
 * Check if post has a toy component
 * @param {Object} post - The blog post
 * @returns {boolean} - True if post has a toy component
 */
function hasToy(post) {
  return hasModulePath(post) && hasFunctionName(post);
}

/**
 * Generate the input section for a toy component
 * @returns {string} - HTML for the input section
 */
function generateToyInputSection() {
  const keyDiv = createDiv(CLASS.KEY, 'in');
  const valueContent = '<form><input type="text" disabled></form>';
  const valueDiv = createValueDiv(valueContent);

  return formatSection(keyDiv, valueDiv);
}

/**
 * Generate the button section for a toy component
 * @returns {string} - HTML for the button section
 */
function generateToyButtonSection() {
  const keyDiv = createEmptyKeyDiv();
  const valueContent = '<button type="submit" disabled>Submit</button>';
  const valueDiv = createValueDiv(valueContent);

  return formatSection(keyDiv, valueDiv);
}

/**
 * Generate the output section for a toy component
 * @returns {string} - HTML for the output section
 */
function getToyOutputSelectDropdown() {
  const optionText = '<option value="text">text</option>';
  const optionPre = '<option value="pre">pre</option>';
  return `<select>${optionText}${optionPre}</select>`;
}

function getToyOutputValueContent() {
  const selectDropdown = getToyOutputSelectDropdown();
  const warningParagraph = '<p>This toy requires Javascript to run.</p>';
  const outputDiv = createDiv('output warning', warningParagraph);
  return selectDropdown + outputDiv;
}

function generateToyOutputSection() {
  const keyDiv = createDiv(CLASS.KEY, 'out');
  const valueContent = getToyOutputValueContent();
  const valueDiv = createValueDiv(valueContent);

  return formatSection(keyDiv, valueDiv);
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

/**
 * Generate the toy UI components for a blog post
 * @param {Object} post - The blog post
 * @returns {string} - HTML for the toy UI components
 */
function generateToyUISection(post) {
  if (!hasToy(post)) {
    return '';
  }

  return combineHTMLSections(
    generateToyInputSection(),
    generateToyButtonSection(),
    generateToyOutputSection()
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
    toyScriptSection
  ];
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  return combineHTMLSections(...getArticleSections(post));
}

/**
 * Create blog HTML content array
 */
function createBlogContentArray(header, articles, footer) {
  // Remove the newline character between elements
  return [header, articles, footer];
}

/**
 * Build the complete HTML content for the blog from header, articles, and footer.
 * @param {string} header - The header HTML.
 * @param {string} articles - The articles HTML.
 * @param {string} footer - The footer HTML.
 * @returns {string} - Combined HTML content.
 */
function getBlogHtmlContent(header, articles, footer) {
  const contentArray = createBlogContentArray(header, articles, footer);
  return contentArray.join('');
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

export const generateBlogOuter = (blog) => {
  const { header, footer, wrapFunc } = getBlogGenerationArgs();
  return generateBlog({ blog, header, footer }, wrapFunc);
};
