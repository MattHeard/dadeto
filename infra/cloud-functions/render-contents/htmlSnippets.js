export const LIST_ITEM_HTML = (pageNumber, title) =>
  `<li><a href="./p/${pageNumber}a.html">${title}</a></li>`;

export const PAGE_HTML = list =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="/dendrite.css" /></head><body><header class="header"><nav class="nav"><a href="/"><img src="/img/logo.png" alt="Dendrite logo" style="height:1em;vertical-align:middle;margin-right:0.5em;" />Dendrite</a><a href="new-story.html">New story</a><a href="mod.html">Moderate</a></nav></header><main><h1>Contents</h1><ol class="contents">${list}</ol></main></body></html>`;
