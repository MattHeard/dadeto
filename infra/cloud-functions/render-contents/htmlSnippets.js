export const LIST_ITEM_HTML = (pageNumber, title) =>
  `<li><a href="./p/${pageNumber}a.html">${title}</a></li>`;

export const PAGE_HTML = list =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" /></head><body><h1><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" /><a href="/">Dendrite</a></h1><h2>Contents</h2><p><a href="mod.html">Moderate</a></p><p><a href="new-story.html">New story</a></p><ol>${list}</ol></body></html>`;
