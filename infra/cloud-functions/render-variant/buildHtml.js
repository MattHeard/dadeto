import { escapeHtml } from './buildAltsHtml.js';

/**
 * Render inline markdown for bold and italics.
 * @param {string} text Text to render.
 * @returns {string} HTML string.
 */
function renderInlineMarkdown(text) {
  let html = escapeHtml(String(text ?? ''));
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  return html;
}

/**
 * Build HTML page for the variant.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {string} content Variant content.
 * @param {Array<{
 *   content: string,
 *   position: number,
 *   targetPageNumber?: number,
 * }>} options Option info.
 * @param {string} [storyTitle] Story title.
 * @param {string} [author] Author name.
 * @param parentUrl
 * @param firstPageUrl
 * @returns {string} HTML page.
 */
export function buildHtml(
  pageNumber,
  variantName,
  content,
  options,
  storyTitle = '',
  author = '',
  parentUrl = '',
  firstPageUrl = ''
) {
  const items = options
    .map(opt => {
      const slug = `${pageNumber}-${variantName}-${opt.position}`;
      const href =
        opt.targetPageNumber !== undefined
          ? `/p/${opt.targetPageNumber}${opt.targetVariantName || ''}.html`
          : `../new-page.html?option=${slug}`;
      const optionHtml = renderInlineMarkdown(opt.content);
      return `<li><a href="${href}">${optionHtml}</a></li>`;
    })
    .join('');
  const title = storyTitle ? `<h1>${escapeHtml(storyTitle)}</h1>` : '';
  const headTitle = storyTitle
    ? `Dendrite - ${escapeHtml(storyTitle)}`
    : 'Dendrite';
  const authorHtml = author ? `<p>By ${escapeHtml(author)}</p>` : '';
  const parentHtml = parentUrl ? `<p><a href="${parentUrl}">Back</a></p>` : '';
  const firstHtml = firstPageUrl
    ? `<p><a href="${firstPageUrl}">First page</a></p>`
    : '';
  const variantSlug = `${pageNumber}${variantName}`;
  const reportHtml =
    '<p><button id="reportBtn" type="button">Report</button></p>' +
    `<script>document.getElementById('reportBtn').onclick=async()=>{try{await fetch('https://europe-west1-irien-465710.cloudfunctions.net/prod-report-for-moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:'${variantSlug}'})});alert('Thanks for your report.');}catch(e){alert('Sorry, something went wrong.');}};</script>`;
  const pageNumberHtml =
    `<p style="text-align:center">` +
    `<a style="text-decoration:none" href="/p/${pageNumber - 1}a.html">◀</a> ` +
    `${pageNumber} ` +
    `<a style="text-decoration:none" href="/p/${pageNumber + 1}a.html">▶</a>` +
    `</p>`;
  const paragraphs = String(content ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => `<p>${renderInlineMarkdown(line)}</p>`)
    .join('');
  return (
    `<!doctype html>` +
    `<html lang="en"><head><meta charset="UTF-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>${headTitle}</title>` +
    `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" />` +
    `<link rel="stylesheet" href="/dendrite.css" />` +
    `</head><body>` +
    `<header class="header"><nav class="nav"><a href="/"><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" />Dendrite</a><a href="../new-story.html">New story</a><a href="../mod.html">Moderate</a><div id="signinButton"></div></nav></header>` +
    `<main>${title}${paragraphs}<ol>${items}</ol>${authorHtml}${parentHtml}${firstHtml}<p><a href="./${pageNumber}-alts.html">Other variants</a></p>${pageNumberHtml}${reportHtml}</main>` +
    `<script src="https://accounts.google.com/gsi/client" defer></script><script type="module">import { initGoogleSignIn } from '../googleAuth.js'; initGoogleSignIn();</script>` +
    `</body></html>`
  );
}
