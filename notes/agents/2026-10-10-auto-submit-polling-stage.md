# Auto-submit polling registration stage

- Unexpected hurdle: extracting the polling function initially left the same expanded dependencies in its call site.
- Diagnosis: the input element already belongs to the interactive component's `elements` object; passing it again duplicated state, while destructuring five values in a single operation exceeded the arity limit.
- Fix: capture the component elements, processor, and environment in `createRegisterAutoSubmitPolling`; the returned registration function accepts only polling state and reads the input from the component bundle.
- Evidence: focused Jest passed 3 suites / 23 tests. Fresh no-cache arity scan removed the target and reduced `src/core/browser/toys.js` from 4 findings to 3. `npm run check` passed all 10 gates; coverage is 100% for branches/functions/lines/statements, local E2E 11/11, 0 clones, and 0 vulnerabilities. Full check log: `.tmp/npm-check-auto-submit-polling.log`.
- Next time: continue with `createInteractiveElements`/the next fresh `toys.js` finding at the top of the current report.
