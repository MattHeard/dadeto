# createButton handler boundary

- Unexpected hurdle: none. The existing row builder already had all state needed to construct the button callback.
- Diagnosis: `createButton` accepted row data, renderer, and key only to compose add/remove handlers; this made a private factory appear to have six dependencies.
- Fix: compose the callback in `createKeyValueRow` and pass the selected handler to `createButton`, which now owns button creation, type, and wiring.
- Evidence: focused Jest run passed 7 suites / 30 tests. Fresh no-cache arity scan removed `createButton` and reduced `toys.js` from 6 findings to 5. `npm run check` passed all 10 groups, including 100% branch/function/line/statement coverage, 11 local browser checks, zero clones, and zero vulnerabilities. Full check log: `.tmp/npm-check-create-button.log`.
- Next time: continue with the next arity finding in `src/core/browser/toys.js`, keeping each factory boundary as a separate loop.
