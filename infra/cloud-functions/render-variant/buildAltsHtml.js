/**
 * Escape HTML special characters.
 * @param {string} text Text to escape.
 * @returns {string} Escaped text.
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build HTML page listing all variants of a page.
 * @param {number} pageNumber Page number.
 * @param {Array<{name: string, content: string}>} variants Variant info.
 * @returns {string} HTML page.
 */
export function buildAltsHtml(pageNumber, variants) {
  const items = variants
    .map(v => {
      const words = String(v.content || '')
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');
      return `<li><a href="/p/${pageNumber}${v.name}.html">${escapeHtml(words)}</a></li>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" /><link rel="stylesheet" href="/dendrite.css" /></head><body><header class="header"><nav class="nav"><a href="/"><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" />Dendrite</a><a href="../new-story.html">New story</a><a href="../mod.html">Moderate</a><a href="../stats.html">Stats</a><div id="signinButton"></div></nav></header><main><ol>${items}</ol></main><script src="https://accounts.google.com/gsi/client" defer></script><script type="module">import { initGoogleSignIn } from '../googleAuth.js'; initGoogleSignIn();</script></body></html>`;
}
