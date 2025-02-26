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
  return [openingTag, content, closingTag].join("");
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
  return replacements.reduce((acc, { from, to }) => acc.replace(from, to), text);
}

/**
 * Format date in "4 May 2022" format
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
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

function createHeaderSection() {
  const h1ValueDiv = createValueDiv(HEADER_BANNER);
  const metadataValueDiv = createValueDiv(METADATA_TEXT, [CLASS.METADATA]);

  const headerContent = [
    prefixWithEmptyKey(h1ValueDiv),
    prefixWithEmptyKey(metadataValueDiv)
  ].join(NEWLINE_WITH_INDENT);

  return createDiv(CLASS.ENTRY, NEWLINE_WITH_INDENT + headerContent + NEWLINE_WITH_INDENT);
}

// Footer components
const WARNING_MESSAGE = "All content is authored by Matt Heard and is <a href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\">CC BY-NC-SA 4.0</a>, unless otherwise noted.";

function createFooterSection() {
  const emptyKeyDiv = createKeyDiv();
  const footerDiv = createDiv(joinClasses([CLASS.FOOTER, CLASS.VALUE, CLASS.WARNING]), WARNING_MESSAGE);
  const footerContent = createKeyValuePair(emptyKeyDiv, footerDiv);
  
  return createDiv(CLASS.ENTRY, NEWLINE_WITH_INDENT + footerContent + NEWLINE_WITH_INDENT);
}

// Page structure
/**
 * Create the page header with head element, body opening tag and header section
 */
function createPageHeader() {
  const headerElement = createHeaderSection();
  
  return [
    headElement,
    '<body>',
    '  <div id="container">',
    '    <!-- Header -->',
    '    ' + headerElement
  ].join('\n');
}

function createPageFooter() {
  const footerElement = createFooterSection();
  
  return [
    '',
    '  ' + footerElement,
    '  </div>',
    '  ' + scriptTag,
    '</body>'
  ].join('\n');
}

function wrapHtml(content) {
  const tagName = HTML_TAG_NAME;
  const attributes = createAttrPair(ATTR_NAME.LANG, LANGUAGE.EN);
  const htmlContent = createTag(tagName, attributes, content);
  return [DOCTYPE, htmlContent].join("");
}

/**
 * Create an article from a blog post
 */
function generateArticle(post) {
  const content = generateArticleContent(post);
  const classAttr = createAttrPair(ATTR_NAME.CLASS, CLASS.ENTRY);
  // Add ID only if the post has a key
  const idAttr = post.key ? " " + createAttrPair(ATTR_NAME.ID, post.key) : "";
  const attributes = `${classAttr}${idAttr}`;
  
  const formattedContent = `
      ${fullWidthElement}
      ${content}
    `;
  
  return createTag(ARTICLE_TAG_NAME, attributes, formattedContent);
}

/**
 * Generate the title section for a blog post
 */
function generateTitleSection(post) {
  const titleClasses = joinClasses([CLASS.KEY, CLASS.ARTICLE_TITLE]);
  const titleKey = createDiv(titleClasses, post.key);
  const titleLink = `<a href="#${post.key}">${post.title}</a>`;
  const titleHeader = `<h2>${titleLink}</h2>`;
  const titleValue = `
      <div class="${CLASS.VALUE}">${titleHeader}</div>`;
  
  return createKeyValuePairInline(titleKey, titleValue);
}

/**
 * Generate the date section for a blog post
 */
function generateDateSection(post) {
  if (!post.publicationDate) {
    return '';
  }
  
  const dateKey = `<div class="${CLASS.KEY}">pubAt</div>`;
  const dateValue = `
      <p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(post.publicationDate)}</p>`;
  
  return `
      ${dateKey}${dateValue}`;
}

/**
 * Higher-order function for generating media sections
 */
function createMediaSectionGenerator(mediaType, label, contentGenerator) {
  return function(post) {
    if (!post[mediaType] || (mediaType !== 'youtube' && !post.publicationDate)) {
      return '';
    }
    
    const keyDiv = `<div class="${CLASS.KEY} ${CLASS.MEDIA}">${label}</div>`;
    const valueDiv = contentGenerator(post);
    
    return `
      ${keyDiv}
      ${valueDiv}`;
  };
}

/**
 * Generate the illustration section for a blog post
 */
function generateIllustrationSection(post) {
  return createMediaSectionGenerator('illustration', 'illus', (post) => {
    return `<div class="${CLASS.VALUE}">
        <img loading="lazy" src="${post.publicationDate}.${post.illustration.fileType}" alt="${post.illustration.altText}"/>
      </div>`;
  })(post);
}

/**
 * Generate the audio section for a blog post
 */
function generateAudioSection(post) {
  return createMediaSectionGenerator('audio', 'audio', (post) => {
    const audioSrc = `${post.publicationDate}.m4a`;
    return `<audio class="${CLASS.VALUE}" controls>
        <source src="${audioSrc}">
      </audio>`;
  })(post);
}

/**
 * Generate the YouTube section for a blog post
 */
function generateYouTubeSection(post) {
  return createMediaSectionGenerator('youtube', 'video', (post) => {
    return `<p class="${CLASS.VALUE}">
        <iframe height="300px" width="100%" src="https://www.youtube.com/embed/${post.youtube.id}?start=${post.youtube.timestamp}" title="${escapeHtml(post.youtube.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe>
      </p>`;
  })(post);
}

/**
 * Generate the text content sections for a blog post
 */
function generateContentSections(post) {
  return (post.content || []).map((text, index) => `
      <div class="${CLASS.KEY}">${index === 0 ? "text" : ""}</div>
      <p class="${CLASS.VALUE}">${text}</p>`
  ).join('');
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  // Title section
  const titleSection = generateTitleSection(post);
  
  // Date section
  const dateSection = generateDateSection(post);
  
  const headerHTML = titleSection + dateSection;

  // Illustration section
  const illustrationHTML = generateIllustrationSection(post);

  // Audio section
  const audioHTML = generateAudioSection(post);

  // YouTube section
  const youtubeHTML = generateYouTubeSection(post);

  // Content sections
  const contentHTML = generateContentSections(post);

  // Combine all sections
  return headerHTML + illustrationHTML + audioHTML + youtubeHTML + contentHTML;
}

/**
 * Generate a complete blog HTML
 */
export function generateBlogOuter(blog) {
  return generateBlog(blog, createPageHeader(), createPageFooter(), wrapHtml);
}

/**
 * Generate blog HTML with customizable header, footer and wrapper
 */
export function generateBlog(blog, header, footer, wrapHtml) {
  const articles = blog.posts
    .map(generateArticle)
    .map(article => "    " + article + "\n")
    .join("");
    
  // We use an array for better readability but need to follow the exact format
  // to match the expected output
  const htmlContents = [
    header,
    "\n",
    articles,
    footer
  ].join("");
  
  return wrapHtml(htmlContents);
}