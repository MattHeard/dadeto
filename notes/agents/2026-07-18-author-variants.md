# Author variant listing

- Unexpected hurdle: hidden files are ignored by the template acceptance server, so the temporary Playwright page had to use a normal `.html` filename.
- Diagnosis: author rendering previously only supplied the author name; variant records can be found with a `collectionGroup('variants')` query and their page number comes from the page ancestor.
- Fix: render visible author variants in numeric page/variant-id order, using the alts page five-word content snippet and links to the variant HTML.
- Next time: use a named temporary HTML page immediately when exercising template acceptance with Playwright.
