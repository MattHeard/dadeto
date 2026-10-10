# Render variant metadata lookup decomposition

- **Unexpected hurdle:** None; the focused integration tests already exercise missing page data, lookup failures, and tenant database rebinding.
- **Diagnosis:** `gatherMetadata` mixed the four records describing what to render with database, storage, logging, and threshold dependencies in one eight-field parameter bag.
- **Chosen fix:** Split the call into a render subject and lookup capabilities. Preserved sequential lookup order: options, story metadata, author metadata, then parent URL; no fallback or logging code changed.
- **Next-time guidance:** Model orchestration inputs as the domain records being rendered plus the services used to resolve their metadata. Fresh no-cache scan reduced `render-variant-core.js` from 4 findings to 3; next is `buildRenderOutput`.
- **Evidence:** Focused render-variant suite passed (107 tests); scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-gather-metadata.log` and `.tmp/build-cloud-render-variant-gather-metadata.log`.
