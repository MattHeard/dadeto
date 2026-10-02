# Rental search page thin adapter

The content-page script exceeded the non-core size gate because it owned API
request construction, status rendering, configuration fallback, and submission
error handling. These now live in `src/core/browser/rentalSearch.js`, with
injected document, fetch, and form-value adapters. The 12-line page script retains
its public request-builder and response-renderer exports.

The browser import is root-relative `/core/browser/rentalSearch.js`, because the
content page is copied to a different directory during generation. `npm run
build` passes and produces both `public/core/browser/rentalSearch.js` and the
page adapter at `public/object-minute-rental-search/search.js`.

Evidence: focused Jest suite passes 11/11 with exact 100% statements, branches,
functions, and lines (`/tmp/dadeto-rental-page-tests.log`, coverage under
`.tmp/rental-page-coverage`). `npm run lint`, `npm run tsdoc:check`, and
`npm run depcruise` pass (corresponding `/tmp/dadeto-rental-page-*.log`).
`npm run non-core-thin` still exits 1 but now reports only `src/browser/webmcp.js`;
the rental page violation is gone. `npm run duplication` still reports 194
clones, with no regression from the previous checkpoint. dadeto-aaou remains
open; aggregate success must be established after all remaining fixes.

Tests exercise pending-button state, invalid form early return, configured and
fallback endpoints, successful requests, missing or malformed response data,
server HTTP errors, JSON failures, string/network rejection, and control recovery.
Server response text uses textContent rather than HTML.
