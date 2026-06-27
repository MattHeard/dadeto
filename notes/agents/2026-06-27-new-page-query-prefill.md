Unexpected hurdle: the static rewrite form already rendered a hidden `page` input, but it never consumed the URL query string, so `new-page.html?page=...` looked correct without affecting submission routing.

Diagnosis: traced the path from `src/core/local/server.js` to `src/core/cloud/submit-new-page/submit-new-page-core.js` and confirmed the backend only appends to an existing page when `page` is present in the POST body.

Chosen fix: populate the hidden `page` field from `window.location.search` on page load and cover it with an e2e regression.

Next time: if query parameters are meant to affect writer forms, verify both the rendered HTML and the submission payload, not just the visible URL.
