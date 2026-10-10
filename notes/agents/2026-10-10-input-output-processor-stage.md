# Input and output processor stage

- Unexpected hurdle: the first lint scan after the extraction moved the finding from `processInputAndSetOutput` into its caller, which still unpacked the same four DOM references.
- Diagnosis: both operations were unpacking a multi-element UI bundle only to pass references to the next step.
- Fix: replace the immediate six-dependency operation with `createProcessInputAndSetOutput`, which captures the live input, processing function, and environment, then accepts parent/output/article as its second stage. Keep the element bundle intact in the error-handling caller and pass its references into that stage.
- Evidence: focused Jest passed 7 suites / 17 tests; `npm run lint` and `npm run tsdoc:check` passed. Fresh no-cache arity scan reduced `src/core/browser/toys.js` from 5 findings to 4. `npm run check` passed all 10 gates; global coverage summary is 100% for branches, functions, lines, and statements; local E2E passed 11/11, duplication found 0 clones, and audit found 0 vulnerabilities. Full check log: `.tmp/npm-check-create-process-input.log`.
- Next time: continue with the next remaining `toys.js` arity finding, `registerAutoSubmitPolling`.
