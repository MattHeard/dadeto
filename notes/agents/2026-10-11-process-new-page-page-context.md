# Process new page page-context resolution

- Unexpected hurdle: the existing-page reuse helper also carried every dependency needed only by the new-page fallback.
- Diagnosis: it first checks for a reusable page, then only on a miss calls the page creator; these are separate phases with different inputs.
- Fix: changed `resolveIncomingOptionPageContext` to accept the target reference and a new-page callback. Existing context still wins, and page creation runs only when no reusable context exists.
- Evidence: focused process-new-page Jest passed (2 suites, 37 tests); fresh no-cache scan dropped from 9 to 8 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `createPageContext`, preserving document payload, batch merge semantics, and returned page context.
