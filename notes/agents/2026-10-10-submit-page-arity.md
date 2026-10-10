# Submit New Page parameter-bag cleanup

- Unexpected hurdle: the request context, storage adapter, and submission payload each form a named protocol, so flattening them would spread one cohesive workflow across many call-site arguments.
- Diagnosis: all three findings were caused by destructuring those records into local variables, which hid their effective field count. The records are meaningful boundaries and remain useful as named values.
- Fix: kept `SubmitNewPageStorageDeps`, `SubmitNewPageContext`, and the submission payload intact; accessed their fields directly instead of unpacking them. The effect token still reaches `saveSubmission` through the current request path.
- Evidence: focused Jest passed (7 suites, 48 tests); scoped ESLint, `npm run tsdoc:check`, and `git diff --check` passed; full `npm run check` passed all 10 gates, with 0 clones and 0 audit vulnerabilities (`.tmp/npm-check-parameter-bag-submit-page.log`). No-cache target scan: `.tmp/parameter-bag-submit-page.scan.json` (0). Fresh global scan: `.tmp/parameter-bag-global-after-submit-page.json` (97 findings).
- Next guidance: the largest remaining cluster is three findings in `src/core/local/gcp-simulator/simulator.js`: `createGenerateStatsConfig`, `createSimulatorTestUtils`, and `createTriggerRegistrationsByEvent`. Preserve simulator effect boundaries and returned test utility/trigger behavior.
