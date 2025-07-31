export const LIST_ITEM_HTML = (pageNumber, title) =>
  `<li><a href="./p/${pageNumber}a.html">${title}</a></li>`;

export const PAGE_HTML = list =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title></head><body><h1><a href="/">Dendrite</a></h1><h2>Contents</h2><ol>${list}</ol></body></html>`;
