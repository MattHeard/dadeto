import { headElement } from './head.js';
import { fullWidthElement } from './full-width.js'

const docType = "<!DOCTYPE html>";
const htmlPrefix = "<html lang='en'>";
const htmlSuffix = "</html>";

const emptyKeyDiv = `<div class="key"></div>`;

const titleText = "Matt Heard";
const h1Element = `<h1>${titleText}</h1>`;
const h1ValueDiv = `<div class="value">${h1Element}</div>`;

const metadataValueDiv = `<div class="value metadata">
  Software developer and philosopher in Berlin
</div>`;

const containerDiv = `<div id="container">
  <!-- Header -->
  <div class="entry">
    ${emptyKeyDiv}
    ${h1ValueDiv}
    ${emptyKeyDiv}
    ${metadataValueDiv}
  </div>`;

const header = `${headElement}
<body>
  ${containerDiv}`;

const footer = `
    <div class="entry">
      <div class="key"></div>
      <div class="footer value warning">
        All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.
      </div>
    </div>
  </div>
  <script>
    const audio = document.getElementById("terminal-audio");
    const timeDisplay = document.getElementById("audio-time");

    function playAudio() {
      audio.play();
    }

    function pauseAudio() {
      audio.pause();
    }

    function stopAudio() {
      audio.pause();
      audio.currentTime = 0;
    }

    audio.addEventListener("timeupdate", function () {
      let minutes = Math.floor(audio.currentTime / 60);
      let seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
      timeDisplay.textContent = [minutes, ":", seconds].join("");
    });
  </script>
</body>`;

const wrapHtml = (c) => [docType, htmlPrefix, c, htmlSuffix].join("");

// Create an article from a post
const getArticleContent = (post) => {
  const titleKey = `<div class="key article-title">${post.key}</div>`;
  const titleValue = `
      <div class="value"><h2><a href="#${post.key}">${post.title}</a></h2></div>`;
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