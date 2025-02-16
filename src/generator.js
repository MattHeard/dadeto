const docType = "<!DOCTYPE html>";
const htmlPrefix = "<html lang='en'>";
const htmlSuffix = "</html>";

const header = `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Matt Heard</title>
  <style>
    /* General Layout & Typography */
    body {
      background-color: #121212;
      color: #CCCCCC;
      font-family: Consolas, monospace;
      font-size: 16px;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    #container {
      max-width: 85ch;
      padding: 1lh;
    }
    .entry {
      display: grid;
      grid-template-columns: 5ch auto;
      padding-bottom: 1em;
      gap: 0em 1em;
    }
    .key {
      font-weight: bold;
      color: #33CCFF;
      text-align: right;
      padding: 0em 0em;
    }
    .value {
      text-align: left;
      color: #CCCCCC;
    }
    .article-title {
      color: #121212;
      background-color: #00FFFF
    }
    .media {
      color: #00FF00;
    }
    .footer {
      font-style: italic;
    }
    .full-width {
      white-space: nowrap;
      font-family: monospace;
      display: block;
      width: 100%;
      overflow: hidden;
      text-overflow: clip;
      line-height: 1;
      color: #00FFFF;
    }

    h1, h2, h3 {
      color: #FFFFFF;
      font-size: 16px;
      margin: 0;
      text-transform: uppercase;
    }
    img {
      max-width: min(20em, 60vw);
      height: auto;
      display: block;
    }
    p {
      margin: 0;
    }
    a {
      color: #00FFFF;
      text-decoration: none;
    }
    a:hover {
      color: #33FFFF;
      text-decoration: underline;
    }
    h1 > a, h2 > a, h3 > a {
      color: #FFFFFF;
    }
    
    /* Log & Message Styles */
    .warning {
      color: #FFA500;
    }
    .error {
      color: #FF0000;
    }
    .success {
      color: #00FF00;
    }
    .metadata {
      color: #33CCFF;
    }
    
    /* Code Blocks & Inline Code */
    code {
      background-color: #1A1A1A;
      color: #00FFFF;
    }
    pre {
      background-color: #1A1A1A;
      color: #CCCCCC;
      padding: 10px;
      overflow-x: auto;
    }
    #audio-controls {
      background-color: #1A1A1A;
      color: #00FFFF;
      display: inline-block;
    }
    .audio-btn {
      padding: 0em 1em;
      border: none;
      background: #00FF00;
      color: #1A1A1A;
      font-family: Consolas, monospace;
      cursor: pointer;
      height: 2em;
    }
    .audio-btn:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div id="container">
    <!-- Header -->
    <div class="entry">
      <div class="key"></div>
      <div class="value"><h1>Matt Heard</h1></div>
      <div class="key"></div>
      <div class="value metadata">
        Software developer and philosopher in Berlin
      </div>
    </div>
`;

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
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
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