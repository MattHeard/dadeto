import { escapeHtml } from './buildAltsHtml.js';

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
 * @returns {string} HTML page.
 */
export function buildHtml(
  pageNumber,
  variantName,
  content,
  options,
  storyTitle = '',
  author = ''
) {
  const items = options
    .map(opt => {
      const slug = `${pageNumber}-${variantName}-${opt.position}`;
      const href =
        opt.targetPageNumber !== undefined
          ? `/p/${opt.targetPageNumber}a.html`
          : `../new-page.html?option=${slug}`;
      return `<li><a href="${href}">${escapeHtml(opt.content)}</a></li>`;
    })
    .join('');
  const title = storyTitle ? `<h1>${escapeHtml(storyTitle)}</h1>` : '';
  const authorHtml = author ? `<p>By ${escapeHtml(author)}</p>` : '';
  const variantSlug = `${pageNumber}${variantName}`;
  const reportHtml =
    '<p><button id="reportBtn" type="button">Report</button></p>' +
    `<script>document.getElementById('reportBtn').onclick=async()=>{try{await fetch('https://europe-west1-irien-465710.cloudfunctions.net/prod-report-for-moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:'${variantSlug}'})});alert('Thanks for your report.');}catch(e){alert('Sorry, something went wrong.');}};</script>`;
  return (
    `<!doctype html>` +
    `<html lang="en"><head><meta charset="UTF-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>Dendrite</title>` +
    `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" />` +
    `<link rel="stylesheet" href="/dendrite.css" />` +
    `</head><body><div class="page">` +
    `<h1><img src="../img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" />` +
    `<a href="/">Dendrite</a></h1>${title}<p>${escapeHtml(content)}</p>` +
    `<ol>${items}</ol>${
      authorHtml
    }<p><a href="./${pageNumber}-alts.html">Other variants</a></p>${
      reportHtml
    }</div></body></html>`
  );
}
