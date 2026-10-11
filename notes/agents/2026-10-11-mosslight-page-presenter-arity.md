# Mosslight page presenter parameter-bag cleanup

- Unexpected hurdle: grouping the browser and animation dependencies added a lint statement warning and copied adapter normalization into two game wrappers, creating a clone.
- Diagnosis: the first full check named both issues precisely; TSDoc also rejected DOM element types that were stricter than the page's fake document adapter.
- Fix: grouped browser APIs and animation scheduling as separate presenter capabilities; grouped page utility callbacks into a page view object; shared environment normalization; reduced bootstrap statements through a focused element resolver. Kept wrapper behavior and lifecycle callbacks intact.
- Evidence: fresh target-file no-cache parameter-bag scan is clear. Focused Mosslight and Neon suites passed (2 suites, 64 tests). TSDoc passed. Final elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators, with 0 clones and 0 audit vulnerabilities; log `.tmp/mosslight-page-presenter-arity-check-final.log`. Refreshed global parameter-bag inventory `.tmp/parameter-bag-global-after-mosslight-page-presenter.json`: 66 findings across 54 files, down from 68.
- Next-time guidance: when an API needs grouping, keep object groups named after capabilities and normalize once in shared code to avoid wrapper drift and clones.
