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
 * @returns {string} HTML page.
 */
export function buildHtml(
  pageNumber,
  variantName,
  content,
  options,
  storyTitle = ''
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
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" /></head><body><h1><img src="../img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" /><a href="/">Dendrite</a></h1>${title}<p>${escapeHtml(content)}</p><ol>${items}</ol><p><a href="./${pageNumber}-alts.html">More options</a></p></body></html>`;
}
