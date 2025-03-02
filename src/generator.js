import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import scriptTag from './script.js';
import { createTag } from './html.js';

// Constants for HTML structure
const DOCTYPE = "<!DOCTYPE html>";

// Language settings
const LANGUAGE = {
  EN: "en"
};

// CSS class names
const CLASS = {
  KEY: "key",
  VALUE: "value",
  ENTRY: "entry",
  ARTICLE_TITLE: "article-title",
  METADATA: "metadata",
  FOOTER: "footer",
  WARNING: "warning",
  MEDIA: "media",
  FULL_WIDTH: "full-width"
};

// HTML tag names
const DIV_TAG_NAME = "div";
const HTML_TAG_NAME = "html";
const ARTICLE_TAG_NAME = "article";

// HTML attribute names
const ATTR_NAME = {
  LANG: "lang",
  CLASS: "class",
  ID: "id"
};

// HTML escape replacements
const HTML_ESCAPE_REPLACEMENTS = [
  { from: /&/g, to: "&amp;" },
  { from: /</g, to: "&lt;" },
  { from: />/g, to: "&gt;" },
  { from: /"/g, to: "&quot;" },
  { from: /'/g, to: "&#039;" },
];

// Date formatting constants
const DATE_LOCALE = 'en-GB';
const DATE_FORMAT_OPTIONS = { 
  day: 'numeric', 
  month: 'short', 
  year: 'numeric' 
};

// HTML generation helpers

/**
 * Create a div element with specified classes and content
 * @param {string} classes - CSS classes to apply to the div
 * @param {string} content - HTML content to place inside the div
 * @returns {string} - HTML div element
 */
function createDiv(classes, content) {
  const tagName = DIV_TAG_NAME;
  const classAttr = createAttrPair(ATTR_NAME.CLASS, classes);
  return createTag(tagName, classAttr, content);
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
 * Create a div with the key class
 * @param {string} content - Content for the key div
 * @returns {string} - HTML div element with key class
 */
function createKeyDiv(content = "") {
  return createDiv(CLASS.KEY, content);
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
 * Joins two HTML elements with a specified separator
 * @param {string} first - The first HTML element
 * @param {string} second - The second HTML element
 * @param {string} separator - The separator to join with
 * @returns {string} - Combined HTML string
 */
function joinHtmlElements(first, second, separator) {
  return [first, second].join(separator);
}

/**
 * Create a key-value pair with two divs, separated by a newline and indent
 * @param {string} keyDiv - The key div HTML
 * @param {string} valueDiv - The value div HTML
 * @returns {string} - Combined key-value HTML with newlines
 */
function createKeyValuePair(keyDiv, valueDiv) {
  return joinHtmlElements(keyDiv, valueDiv, NEWLINE_WITH_INDENT);
}

/**
 * Create a key-value pair with two divs without adding newlines
 * @param {string} keyDiv - The key div HTML
 * @param {string} valueDiv - The value div HTML
 * @returns {string} - Combined key-value HTML with no spacing
 */
function createKeyValuePairInline(keyDiv, valueDiv) {
  return joinHtmlElements(keyDiv, valueDiv, "");
}

/**
 * Create an HTML attribute name-value pair
 * @param {string} attrName - The attribute name
 * @param {string} attrValue - The attribute value
 * @returns {string} - Formatted attribute string (name="value")
 */
function createAttrPair(attrName, attrValue) {
  return `${attrName}="${attrValue}"`;
}

/**
 * Apply a single HTML escape replacement
 * @param {string} text - The text to process
 * @param {Object} replacement - The replacement definition
 * @param {RegExp} replacement.from - The pattern to replace
 * @param {string} replacement.to - The replacement string
 * @returns {string} - Text with the replacement applied
 */
function applyHtmlEscapeReplacement(text, replacement) {
  const { from, to } = replacement;
  return text.replace(from, to);
}

/**
 * Apply all HTML escape replacements
 * @param {string} text - The text to process
 * @param {Array<Object>} replacements - Array of replacement definitions
 * @returns {string} - Text with all replacements applied
 */
function applyAllHtmlEscapeReplacements(text, replacements) {
  let result = text;
  
  for (const replacement of replacements) {
    result = applyHtmlEscapeReplacement(result, replacement);
  }
  
  return result;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
  return applyAllHtmlEscapeReplacements(text, HTML_ESCAPE_REPLACEMENTS);
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
const HEADER_BANNER = `<pre aria-label="Matt Heard" role="heading" aria-level="1">
▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖      
▐▛▚▞▜▌▐▌ ▐▌ █    █        
▐▌  ▐▌▐▛▀▜▌ █    █        
▐▌  ▐▌▐▌ ▐▌ █    █        
▗▖ ▗▖▗▄▄▄▖ ▗▄▖ ▗▄▄▖ ▗▄▄▄  
▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌  █ 
▐▛▀▜▌▐▛▀▀▘▐▛▀▜▌▐▛▀▚▖▐▌  █ 
▐▌ ▐▌▐▙▄▄▖▐▌ ▐▌▐▌ ▐▌▐▙▄▄▀
</pre>`;

const NEWLINE_WITH_INDENT = '\n  ';

const METADATA_TEXT = `${NEWLINE_WITH_INDENT}Software developer and philosopher in Berlin${NEWLINE_WITH_INDENT}`;

function prefixWithEmptyKey(valueDiv) {
  const emptyKeyDiv = createKeyDiv();
  return createKeyValuePair(emptyKeyDiv, valueDiv);
}

/**
 * Create the content for the header section
 */
function createHeaderContent() {
  const h1ValueDiv = createValueDiv(HEADER_BANNER);
  const metadataValueDiv = createValueDiv(METADATA_TEXT, [CLASS.METADATA]);

  return [
    prefixWithEmptyKey(h1ValueDiv),
    prefixWithEmptyKey(metadataValueDiv)
  ].join(NEWLINE_WITH_INDENT);
}

/**
 * Create a section with the given content
 * @param {string} content - The content to wrap in a section
 * @returns {string} - HTML for the section
 */
function createSection(content) {
  return createDiv(
    CLASS.ENTRY, 
    NEWLINE_WITH_INDENT + content + NEWLINE_WITH_INDENT
  );
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
const WARNING_MESSAGE = "All content is authored by Matt Heard and is <a href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\">CC BY-NC-SA 4.0</a>, unless otherwise noted.";

/**
 * Create the content for the footer section
 * @returns {string} - HTML for the footer content
 */
function createFooterContent() {
  const emptyKeyDiv = createKeyDiv();
  const footerDiv = createDiv(
    joinClasses([CLASS.FOOTER, CLASS.VALUE, CLASS.WARNING]), 
    WARNING_MESSAGE
  );
  return createKeyValuePair(emptyKeyDiv, footerDiv);
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
 * Create the opening container div
 */
function createContainerDivOpen() {
  return '  <div id="container">';
}

/**
 * Create the header content array
 */
function createHeaderContentArray(headerElement) {
  return [
    headElement,
    '<body>',
    createContainerDivOpen(),
    '    <!-- Header -->',
    '    ' + headerElement
  ];
}

/**
 * Create the page header with head element, body opening tag and header section
 */
function createPageHeader() {
  const headerElement = createHeaderSection();
  const contentArray = createHeaderContentArray(headerElement);
  
  return contentArray.join('\n');
}

/**
 * Create the closing container div
 */
function createContainerDivClose() {
  return '  </div>';
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
    '  ' + footerElement,
    createContainerDivClose(),
    '  ' + scriptTag,
    createBodyClose()
  ];
}

/**
 * Create the page footer with footer section, container div closing, and body closing tag
 */
function createPageFooter() {
  const footerElement = createFooterSection();
  const contentArray = createFooterContentArray(footerElement);
  
  return contentArray.join('\n');
}

/**
 * Create the DOCTYPE declaration
 */
function createDoctype() {
  return DOCTYPE;
}

/**
 * Create the HTML tag with language attribute
 */
function createHtmlTag(content) {
  const tagName = HTML_TAG_NAME;
  const attributes = createAttrPair(ATTR_NAME.LANG, LANGUAGE.EN);
  return createTag(tagName, attributes, content);
}

/**
 * Wrap content in HTML structure
 */
function wrapHtml(content) {
  const htmlContent = createHtmlTag(content);
  const doctype = createDoctype();
  const parts = [doctype, htmlContent];
  return parts.join("");
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
  return "    " + articleHTML + "\n";
}

/**
 * Process posts and join article HTML
 */
function processPostsToHTML(posts) {
  const articleHTMLs = posts.map(convertPostToArticleHTML);
  const formattedHTMLs = articleHTMLs.map(formatArticleHTML);
  return formattedHTMLs.join("");
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
function createIdAttributeIfNeeded(post) {
  if (!post.key) {
    return "";
  }
  
  return " " + createAttrPair(ATTR_NAME.ID, post.key);
}

/**
 * Create attributes for an article element
 */
function createArticleAttributes(post) {
  const classAttr = createAttrPair(ATTR_NAME.CLASS, CLASS.ENTRY);
  const idAttr = createIdAttributeIfNeeded(post);
  
  return `${classAttr}${idAttr}`;
}

/**
 * Format article content with full width element
 */
function formatArticleContent(content) {
  return `
      ${fullWidthElement}
      ${content}
    `;
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
 * Create a content section item with exact formatting
 * @param {string} text - The content text
 * @param {boolean} isFirst - Whether this is the first content item
 * @returns {string} - Formatted content section HTML
 */
function createContentSectionItem(text, isFirst) {
  const key = isFirst ? "text" : "";
  const keyDiv = createDiv(CLASS.KEY, key);
  const valueDiv = `<p class="${CLASS.VALUE}">${text}</p>`;
  
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
  
  return combineHTMLSections(titleSection, dateSection);
}

/**
 * Create the title value for a blog post
 */
function createTitleValue(post) {
  const titleLink = `<a href="#${post.key}">${post.title}</a>`;
  const titleHeader = `<h2>${titleLink}</h2>`;
  return `
      <div class="${CLASS.VALUE}">${titleHeader}</div>`;
}

/**
 * Generate the title section for a blog post
 */
function generateTitleSection(post) {
  const titleClasses = joinClasses([CLASS.KEY, CLASS.ARTICLE_TITLE]);
  const titleKey = createDiv(titleClasses, post.key);
  const titleValue = createTitleValue(post);
  
  return createKeyValuePairInline(titleKey, titleValue);
}

/**
 * Generate the date section for a blog post
 */
function generateDateSection(post) {
  if (!post.publicationDate) {
    return '';
  }
  
  const dateKey = createDiv(CLASS.KEY, "pubAt");
  const dateValue = `
      <p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(post.publicationDate)}</p>`;
  
  return `
      ${dateKey}${dateValue}`;
}

/**
 * Check if post has the specified media type
 */
function hasMediaType(post, mediaType) {
  return !!post[mediaType];
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
  return `
      ${keyDiv}
      ${valueDiv}`;
}

/**
 * Generate media content based on media type
 */
function generateMediaContent(post, mediaType) {
  switch (mediaType) {
    case 'illustration':
      return createIllustrationContent(post);
    case 'audio':
      return createAudioContent(post);
    case 'youtube':
      return createYouTubeContent(post);
    default:
      return '';
  }
}

/**
 * Higher-order function for generating media sections
 */
function createMediaSectionGenerator(mediaType, label) {
  return function(post) {
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
  const src = `${post.publicationDate}.${post.illustration.fileType}`;
  const altText = post.illustration.altText;
  
  return `<img loading="lazy" src="${src}" alt="${altText}"/>`;
}

/**
 * Create illustration content
 */
function createIllustrationContent(post) {
  const image = createIllustrationImage(post);
  
  return `<div class="${CLASS.VALUE}">
        ${image}
      </div>`;
}

/**
 * Create audio source element
 */
function createAudioSource(post) {
  const audioSrc = `${post.publicationDate}.m4a`;
  return `<source src="${audioSrc}">`;
}

/**
 * Create audio content
 */
function createAudioContent(post) {
  const source = createAudioSource(post);
  
  return `<audio class="${CLASS.VALUE}" controls>
        ${source}
      </audio>`;
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
  
  return `<p class="${CLASS.VALUE}">
        ${iframe}
      </p>`;
}

/**
 * Generate the illustration section for a blog post
 */
function generateIllustrationSection(post) {
  return createMediaSectionGenerator('illustration', 'illus')(post);
}

/**
 * Generate the audio section for a blog post
 */
function generateAudioSection(post) {
  return createMediaSectionGenerator('audio', 'audio')(post);
}

/**
 * Generate the YouTube section for a blog post
 */
function generateYouTubeSection(post) {
  return createMediaSectionGenerator('youtube', 'video')(post);
}

/**
 * Generate all media sections for a blog post
 */
function generateMediaSections(post) {
  return combineHTMLSections(
    generateIllustrationSection(post),
    generateAudioSection(post),
    generateYouTubeSection(post)
  );
}

/**
 * Combine multiple HTML sections into a single string
 */
function combineHTMLSections(...sections) {
  return sections.join('');
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  return combineHTMLSections(
    generateHeaderSection(post),
    generateMediaSections(post),
    generateContentSections(post)
  );
}

/**
 * Create blog HTML content array
 */
function createBlogContentArray(header, articles, footer) {
  return [
    header,
    "\n",
    articles,
    footer
  ];
}

/**
 * Generate blog HTML with customizable header, footer and wrapper
 */
export function generateBlog(blog, header, footer, wrapHtml) {
  const articles = generateArticles(blog.posts);
  const contentArray = createBlogContentArray(header, articles, footer);
  const htmlContents = contentArray.join("");
  
  return wrapHtml(htmlContents);
}

/**
 * Create blog components needed for generation
 */
function createBlogComponents() {
  return {
    header: createPageHeader(),
    footer: createPageFooter(),
    wrapFunc: wrapHtml
  };
}

/**
 * Generate a complete blog HTML
 */
export function generateBlogOuter(blog) {
  const components = createBlogComponents();
  return generateBlog(
    blog, 
    components.header, 
    components.footer, 
    components.wrapFunc
  );
}