import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js'
import scriptTag from './script.js';

const docType = "<!DOCTYPE html>";
const htmlPrefix = "<html lang='en'>";
const htmlSuffix = "</html>";

const keyClass = "key";
const emptyKeyDiv = createDivElement(keyClass, "");

const titleText = "Matt Heard";
const h1Element = `<h1>${titleText}</h1>`;

const valueClass = "value";
const classJoinSeparator = ' ';
const titleKeyClasses = joinClasses(["key", "article-title"]);

function createDivElement(classes, content) {
  return `<div class="${classes}">${content}</div>`;
}

const h1ValueDiv = createDivElement(valueClass, h1Element);

const indent = '\n  ';

const metadataText = `${indent}Software developer and philosopher in Berlin${indent}`;
const metadataClass = "metadata";

function joinClasses(classes) {
  return classes.join(classJoinSeparator);
}

const metadataValueClasses = joinClasses([valueClass, metadataClass]);
const metadataValueDiv = createDivElement(metadataValueClasses, metadataText);

const entryDivContents = [
  emptyKeyDiv,
  h1ValueDiv,
  emptyKeyDiv,
  metadataValueDiv
].join(indent);

const entryClass = "entry";

const entryDivContent = [indent, entryDivContents, indent].join('');
const entryDiv = createDivElement(entryClass, entryDivContent);

const header = `${headElement}
<body>
  <div id="container">
    <!-- Header -->
    ${entryDiv}`;

const warningMessage = "All content is authored by Matt Heard and is <a href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\">CC BY-NC-SA 4.0</a>, unless otherwise noted.";

const footerDivClasses = joinClasses(["footer", valueClass, "warning"]);
const footerDiv = createDivElement(footerDivClasses, warningMessage);

const warningDivContents = [emptyKeyDiv, footerDiv].join(indent);

const warningDiv = createDivElement(entryClass, `${indent}${warningDivContents}${indent}`);

const footer = `
  ${warningDiv}
  </div>
  ${scriptTag}>
</body>`;

const wrapHtml = (c) => [docType, htmlPrefix, c, htmlSuffix].join("");

// Create an article from a post
const getArticleContent = (post) => {
  const titleKey = createDivElement(titleKeyClasses, post.key);
  const titleLink = `<a href="#${post.key}">${post.title}</a>`;
  const titleHeader = `<h2>${titleLink}</h2>`;
  const titleValue = `
      <div class="${valueClass}">${titleHeader}</div>`;
  const dateKey = `<div class="key">pubAt</div>`;
  const dateValue = `
      <p class="value metadata">${new Date(post.publicationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>`;
  const dateHtml = post.publicationDate ? `
      ${dateKey}${dateValue}` : '';
  const headerHTML = [titleKey, titleValue, dateHtml].join("");

  let illustrationHTML = '';
  if (post.illustration && post.publicationDate) {
    illustrationHTML = `
      <div class="key media">illus</div>
      <div class="value">
        <img loading="lazy" src="${post.publicationDate}.${post.illustration.fileType}" alt="${post.illustration.altText}"/>
      </div>`;
  }

  const youtubeHTML = post.youtube ? `
      <div class="key media">video</div>
      <p class="value">
        <iframe height="300px" width="100%" src="https://www.youtube.com/embed/${post.youtube.id}?start=${post.youtube.timestamp}" title="${escapeHtml(post.youtube.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe>
      </p>` : '';

  const contentHTML = (post.content || []).map((text, index) => `
      <div class="key">${index === 0 ? "text" : ""}</div>
      <p class="value">${text}</p>`
    ).join('');

  return headerHTML + illustrationHTML + youtubeHTML + contentHTML;
};

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

const getArticle = (post) => {
    const content = getArticleContent(post);
    const idAttr = post.key ? ` id=\"${post.key}\"` : "";
    return `<article class=\"entry\"${idAttr}>
      ${fullWidthElement}
      ${content}
    </article>`;
};

// Generate the HTML from a blog
export function generateBlogOuter(blog) {
    return generateBlog(blog, header, footer, wrapHtml);
};

export function generateBlog(blog, header, footer, wrapHtml) {
    const articles = blog.posts.map(getArticle).map(article => "    " + article + "\n");
    const htmlContents = header + "\n" + articles.join("") + footer;
    return wrapHtml(htmlContents);
};