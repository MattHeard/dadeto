import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import scriptTag from './script.js';

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

// HTML generation helpers
function createTag(tagName, attributes, content) {
  const openingTag = `<${tagName} ${attributes}>`;
  const closingTag = `</${tagName}>`;
  const tagParts = [openingTag, content, closingTag];
  return tagParts.join("");
}

function createDiv(classes, content) {
  const tagName = DIV_TAG_NAME;
  const classAttr = createAttrPair(ATTR_NAME.CLASS, classes);
  return createTag(tagName, classAttr, content);
}

function joinClasses(classes) {
  return classes.join(' ');
}

function createKeyDiv(content = "") {
  return createDiv(CLASS.KEY, content);
}

function createValueDiv(content, additionalClasses = []) {
  const classes = [CLASS.VALUE, ...additionalClasses].filter(Boolean);
  const joinedClasses = joinClasses(classes);
  return createDiv(joinedClasses, content);
}

/**
 * Create a key-value pair with two divs
 */
function createKeyValuePair(keyDiv, valueDiv) {
  return [keyDiv, valueDiv].join(NEWLINE_WITH_INDENT);
}

/**
 * Create a key-value pair with two divs without adding newlines
 */
function createKeyValuePairInline(keyDiv, valueDiv) {
  return [keyDiv, valueDiv].join("");
}

function createAttrPair(attrName, attrValue) {
  return `${attrName}="${attrValue}"`;
}

/**
 * Apply a single HTML escape replacement
 */
function applyHtmlEscapeReplacement(text, replacement) {
  const { from, to } = replacement;
  return text.replace(from, to);
}

/**
 * Apply all HTML escape replacements
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
 */
function escapeHtml(text) {
  const replacements = [
    { from: /&/g, to: "&amp;" },
    { from: /</g, to: "&lt;" },
    { from: />/g, to: "&gt;" },
    { from: /"/g, to: "&quot;" },
    { from: /'/g, to: "&#039;" },
  ];
  
  return applyAllHtmlEscapeReplacements(text, replacements);
}

/**
 * Create date formatting options
 */
function createDateFormatOptions() {
  return { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  };
}

/**
 * Convert a date string to a Date object
 */
function createDateFromString(dateString) {
  return new Date(dateString);
}

/**
 * Format date in "4 May 2022" format
 */
function formatDate(dateString) {
  const date = createDateFromString(dateString);
  const options = createDateFormatOptions();
  return date.toLocaleDateString('en-GB', options);
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
 * Create the header section with banner and metadata
 */
function createHeaderSection() {
  const headerContent = createHeaderContent();
  return createDiv(CLASS.ENTRY, NEWLINE_WITH_INDENT + headerContent + NEWLINE_WITH_INDENT);
}

// Footer components
const WARNING_MESSAGE = "All content is authored by Matt Heard and is <a href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\">CC BY-NC-SA 4.0</a>, unless otherwise noted.";

/**
 * Create the content for the footer section
 */
function createFooterContent() {
  const emptyKeyDiv = createKeyDiv();
  const footerDiv = createDiv(joinClasses([CLASS.FOOTER, CLASS.VALUE, CLASS.WARNING]), WARNING_MESSAGE);
  return createKeyValuePair(emptyKeyDiv, footerDiv);
}

/**
 * Create the footer section with warning message
 */
function createFooterSection() {
  const footerContent = createFooterContent();
  return createDiv(CLASS.ENTRY, NEWLINE_WITH_INDENT + footerContent + NEWLINE_WITH_INDENT);
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
 * Combine title and date sections
 */
function combineTitleAndDateSections(titleSection, dateSection) {
  return titleSection + dateSection;
}

/**
 * Generate header section for a blog post
 */
function generateHeaderSection(post) {
  const titleSection = generateTitleSection(post);
  const dateSection = generateDateSection(post);
  
  return combineTitleAndDateSections(titleSection, dateSection);
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
 * Format a media section with key and value divs
 */
function formatMediaSection(keyDiv, valueDiv) {
  return `
      ${keyDiv}
      ${valueDiv}`;
}

/**
 * Higher-order function for generating media sections
 */
function createMediaSectionGenerator(mediaType, label, contentGenerator) {
  return function(post) {
    if (!shouldDisplayMedia(post, mediaType)) {
      return '';
    }
    
    const keyDiv = createMediaKeyDiv(label);
    const valueDiv = contentGenerator(post);
    
    return formatMediaSection(keyDiv, valueDiv);
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
 * Generate the illustration section for a blog post
 */
function generateIllustrationSection(post) {
  return createMediaSectionGenerator('illustration', 'illus', createIllustrationContent)(post);
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
 * Generate the audio section for a blog post
 */
function generateAudioSection(post) {
  return createMediaSectionGenerator('audio', 'audio', createAudioContent)(post);
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
 * Generate the YouTube section for a blog post
 */
function generateYouTubeSection(post) {
  return createMediaSectionGenerator('youtube', 'video', createYouTubeContent)(post);
}

/**
 * Combine all media section HTML
 */
function combineMediaSections(illustrationHTML, audioHTML, youtubeHTML) {
  return illustrationHTML + audioHTML + youtubeHTML;
}

/**
 * Generate all media sections for a blog post
 */
function generateMediaSections(post) {
  const illustrationHTML = generateIllustrationSection(post);
  const audioHTML = generateAudioSection(post);
  const youtubeHTML = generateYouTubeSection(post);
  
  return combineMediaSections(illustrationHTML, audioHTML, youtubeHTML);
}

/**
 * Determine if an item is the first in the content array
 */
function isFirstContentItem(index) {
  return index === 0;
}

/**
 * Create HTML for a single content item
 */
function createContentItemHTML(text, index) {
  const isFirst = isFirstContentItem(index);
  return createContentSectionItem(text, isFirst);
}

/**
 * Map content items to HTML
 */
function mapContentToHTML(contentArray) {
  return contentArray.map(createContentItemHTML);
}

/**
 * Create a content section item with exact formatting
 */
function createContentSectionItem(text, isFirst) {
  const key = isFirst ? "text" : "";
  const keyDiv = createDiv(CLASS.KEY, key);
  const valueDiv = `<p class="${CLASS.VALUE}">${text}</p>`;
  
  return `
      ${keyDiv}
      ${valueDiv}`;
}

/**
 * Generate the text content sections for a blog post
 */
function generateContentSections(post) {
  const contentArray = post.content || [];
  const contentItems = mapContentToHTML(contentArray);
  return contentItems.join('');
}

/**
 * Combine all sections of an article
 */
function combineArticleSections(headerHTML, mediaHTML, contentHTML) {
  return headerHTML + mediaHTML + contentHTML;
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  const headerHTML = generateHeaderSection(post);
  const mediaHTML = generateMediaSections(post);
  const contentHTML = generateContentSections(post);

  return combineArticleSections(headerHTML, mediaHTML, contentHTML);
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