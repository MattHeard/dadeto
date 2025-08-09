export const LIST_ITEM_HTML = (pageNumber, title) =>
  `<li><a href="./p/${pageNumber}a.html">${title}</a></li>`;

export const PAGE_HTML = list =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" /><link rel="stylesheet" href="/dendrite.css" /></head><body><div class="page"><h1><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" /><a href="/">Dendrite</a></h1><nav><ul><li><a href="new-story.html">New story</a></li><li><a href="mod.html">Moderate</a></li></ul></nav><h2>Contents</h2><ol>${list}</ol></div></body></html>`;
