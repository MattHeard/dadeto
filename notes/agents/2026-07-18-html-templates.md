# Generated Dendrite HTML templates

- Unexpected hurdle: the cloud copy pipeline only copied `.js` and `.json`, so checked-in HTML templates were absent from deploy bundles.
- Diagnosis: `copy-cloud` recursively uses `DEFAULT_COPYABLE_EXTENSIONS`; adding `.html` makes the templates available in generated function packages.
- Chosen fix: extracted variant, alternate-variant, contents, stats, and author documents into sibling `.html` files and render them with `renderHtmlTemplate`.
- Next-time guidance: run `npm run build:cloud` and inspect the ignored `infra/cloud-functions/` bundle to verify templates are copied; full `npm run check` currently has unrelated lint/TSDoc baseline failures.
