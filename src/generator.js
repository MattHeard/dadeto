import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js';
import scriptTag from './script.js';

// Constants for HTML structure
const DOCTYPE = "<!DOCTYPE html>";

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

// HTML generation helpers
function createTag(tagName, attributes, content) {
  const openingTag = `<${tagName} ${attributes}>`;
  const closingTag = `</${tagName}>`;
  return [openingTag, content, closingTag].join("");
}

function createDiv(classes, content) {
  const tagName = "div";
  const classAttr = createAttrPair("class", classes);
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
  return [emptyKeyDiv, valueDiv].join(NEWLINE_WITH_INDENT);
}

function createHeaderSection() {
  const h1ValueDiv = createValueDiv(HEADER_BANNER);
  const metadataValueDiv = createValueDiv(METADATA_TEXT, [CLASS.METADATA]);

  const headerContent = [
    prefixWithEmptyKey(h1ValueDiv),
    prefixWithEmptyKey(metadataValueDiv)
  ].join('\n  ');

  return createDiv(CLASS.ENTRY, `\n  ${headerContent}\n  `);
}

// Footer components
const WARNING_MESSAGE = "All content is authored by Matt Heard and is <a href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\">CC BY-NC-SA 4.0</a>, unless otherwise noted.";

function createFooterSection() {
  const emptyKeyDiv = createKeyDiv();
  const footerDiv = createDiv(joinClasses([CLASS.FOOTER, CLASS.VALUE, CLASS.WARNING]), WARNING_MESSAGE);
  const footerContent = [emptyKeyDiv, footerDiv].join('\n  ');
  
  return createDiv(CLASS.ENTRY, `\n  ${footerContent}\n  `);
}

// Page structure
function createPageHeader() {
  const headerElement = createHeaderSection();
  return `${headElement}
<body>
  <div id="container">
    <!-- Header -->
    ${headerElement}`;
}

function createPageFooter() {
  const footerElement = createFooterSection();
  return `
  ${footerElement}
  </div>
  ${scriptTag}
</body>`;
}

function wrapHtml(content) {
  const tagName = "html";
  const language = "en";
  const langAttr = "lang";
  const langAttrPair = createAttrPair(langAttr, language);
  const htmlContent = [`<${tagName} ${langAttrPair}>`, content, `</${tagName}>`].join("");
  return [DOCTYPE, htmlContent].join("");
}

/**
 * Create an article from a blog post
 */
function generateArticle(post) {
  const content = generateArticleContent(post);
  const idAttr = post.key ? ` id="${post.key}"` : "";
  const classAttr = ` class="${CLASS.ENTRY}"`;
  const tagName = "article";
  
  return `<${tagName}${classAttr}${idAttr}>
      ${fullWidthElement}
      ${content}
    </${tagName}>`;
}

/**
 * Generate the content of a blog post article
 */
function generateArticleContent(post) {
  // Title section
  const titleClasses = joinClasses([CLASS.KEY, CLASS.ARTICLE_TITLE]);
  const titleKey = createDiv(titleClasses, post.key);
  const titleLink = `<a href="#${post.key}">${post.title}</a>`;
  const titleHeader = `<h2>${titleLink}</h2>`;
  const titleValue = `
      <div class="${CLASS.VALUE}">${titleHeader}</div>`;
  
  // Date section
  let dateHtml = '';
  if (post.publicationDate) {
    const dateKey = `<div class="${CLASS.KEY}">pubAt</div>`;
    const dateValue = `
      <p class="${CLASS.VALUE} ${CLASS.METADATA}">${formatDate(post.publicationDate)}</p>`;
    dateHtml = `
      ${dateKey}${dateValue}`;
  }
  
  const headerHTML = [titleKey, titleValue, dateHtml].join("");

  // Illustration section
  let illustrationHTML = '';
  if (post.illustration && post.publicationDate) {
    illustrationHTML = `
      <div class="${CLASS.KEY} ${CLASS.MEDIA}">illus</div>
      <div class="${CLASS.VALUE}">
        <img loading="lazy" src="${post.publicationDate}.${post.illustration.fileType}" alt="${post.illustration.altText}"/>
      </div>`;
  }

  // Audio section
  let audioHTML = '';
  if (post.audio) {
    const audioSrc = `${post.publicationDate}.m4a`;
    audioHTML = `
      <div class="${CLASS.KEY} ${CLASS.MEDIA}">audio</div>
      <audio class="${CLASS.VALUE}" controls>
        <source src="${audioSrc}">
      </audio>`;
  }

  // YouTube section
  let youtubeHTML = '';
  if (post.youtube) {
    youtubeHTML = `
      <div class="${CLASS.KEY} ${CLASS.MEDIA}">video</div>
      <p class="${CLASS.VALUE}">
        <iframe height="300px" width="100%" src="https://www.youtube.com/embed/${post.youtube.id}?start=${post.youtube.timestamp}" title="${escapeHtml(post.youtube.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe>
      </p>`;
  }

  // Content sections
  const contentHTML = (post.content || []).map((text, index) => `
      <div class="${CLASS.KEY}">${index === 0 ? "text" : ""}</div>
      <p class="${CLASS.VALUE}">${text}</p>`
  ).join('');

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
    
  const htmlContents = header + "\n" + articles + footer;
  return wrapHtml(htmlContents);
}