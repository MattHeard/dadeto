# Cloud core parameter-bag cleanup

- Unexpected hurdle: `createVerifyAdmin` relies on JavaScript parameter-default semantics for its optional logger, so a direct conversion could subtly change handling of explicitly supplied values.
- Diagnosis: both findings were named boundary records: a Firestore trigger registration contract and an admin authorization dependency contract. Their fields are configuration, not a positional command invocation, so the named records remain the clearest API.
- Fix: added reusable JSDoc types for both records and accessed them directly. Preserved the Firestore optional-database fallback and made the logger default apply only when its value is `undefined`, as before.
- Evidence: focused Jest passed (6 suites, 68 tests); scoped ESLint, TSDoc, and `git diff --check` passed; `npm run build:cloud` passed; the final `npm run check` passed all 10 gates (`.tmp/npm-check-parameter-bag-cloud-core.log`), with 0 clones and 0 audit vulnerabilities. Per-file no-cache scan: `.tmp/parameter-bag-cloud-core.scan.json` (0). Global scan: `.tmp/parameter-bag-global-after-cloud-core.json` (92 findings).
- Next guidance: the next two findings are in `src/core/cloud/firestore-helpers.js`: `isDefaultFirestoreContext` and `createFirestoreInstanceResolver`. Preserve process-default cache identity and resolver-specific cache policy.
